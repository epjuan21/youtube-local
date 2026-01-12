// src/main/ipc/historyHandlers.js
// Sistema de Historial de Reproducción - Fase 4
// Maneja el registro de reproducciones, progreso y "Continuar viendo"

const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

/**
 * Genera un ID de sesión único para agrupar reproducciones
 * Se genera uno nuevo cada vez que se inicia la aplicación
 */
let currentSessionId = null;

function generateSessionId() {
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return currentSessionId;
}

function getCurrentSessionId() {
    if (!currentSessionId) {
        generateSessionId();
    }
    return currentSessionId;
}

/**
 * Registra el inicio de una reproducción
 */
function recordWatch(videoId, durationSeconds = 0) {
    try {
        const db = getDatabase();
        const sessionId = getCurrentSessionId();

        // Insertar en historial
        const stmt = db.prepare(`
      INSERT INTO watch_history (video_id, duration_seconds, session_id)
      VALUES (?, ?, ?)
    `);
        const result = stmt.run(videoId, durationSeconds, sessionId);

        // Actualizar o crear progreso
        const progressStmt = db.prepare(`
      INSERT INTO watch_progress (video_id, last_watched, watch_count)
      VALUES (?, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(video_id) DO UPDATE SET
        last_watched = CURRENT_TIMESTAMP,
        watch_count = watch_count + 1
    `);
        progressStmt.run(videoId);

        // Incrementar view_count en la tabla videos
        const updateViewsStmt = db.prepare(`
      UPDATE videos SET views = views + 1 WHERE id = ?
    `);
        updateViewsStmt.run(videoId);

        console.log(`[History] Reproducción registrada: video ${videoId}, historial ID ${result.lastInsertRowid}`);

        return {
            success: true,
            historyId: result.lastInsertRowid,
            sessionId
        };
    } catch (error) {
        console.error('[History] Error al registrar reproducción:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza el progreso de reproducción
 * Se llama periódicamente durante la reproducción (cada 10 segundos)
 */
function updateProgress(videoId, progressSeconds, durationSeconds) {
    try {
        const db = getDatabase();
        const percentage = durationSeconds > 0
            ? Math.min(100, (progressSeconds / durationSeconds) * 100)
            : 0;
        const completed = percentage >= 90 ? 1 : 0;

        // Actualizar el último registro en historial de esta sesión
        const sessionId = getCurrentSessionId();
        const historyStmt = db.prepare(`
      UPDATE watch_history 
      SET progress_seconds = ?, 
          duration_seconds = ?,
          percentage_watched = ?,
          completed = ?
      WHERE id = (
        SELECT id FROM watch_history 
        WHERE video_id = ? AND session_id = ?
        ORDER BY watched_at DESC 
        LIMIT 1
      )
    `);
        historyStmt.run(progressSeconds, durationSeconds, percentage, completed, videoId, sessionId);

        // Actualizar progreso actual
        const progressStmt = db.prepare(`
      INSERT INTO watch_progress (video_id, last_position, last_watched, total_watch_time, watch_count, completed_count)
      VALUES (?, ?, CURRENT_TIMESTAMP, 10, 1, ?)
      ON CONFLICT(video_id) DO UPDATE SET
        last_position = ?,
        last_watched = CURRENT_TIMESTAMP,
        total_watch_time = total_watch_time + 10,
        completed_count = CASE WHEN ? = 1 AND completed_count < watch_count THEN completed_count + 1 ELSE completed_count END
    `);
        progressStmt.run(videoId, progressSeconds, completed, progressSeconds, completed);

        return {
            success: true,
            percentage: Math.round(percentage * 100) / 100,
            completed: completed === 1
        };
    } catch (error) {
        console.error('[History] Error al actualizar progreso:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene la última posición de un video para continuar viendo
 */
function getLastPosition(videoId) {
    try {
        const db = getDatabase();
        const stmt = db.prepare(`
      SELECT last_position, total_watch_time, watch_count, completed_count, last_watched
      FROM watch_progress
      WHERE video_id = ?
    `);
        const progress = stmt.get(videoId);

        if (!progress) {
            return { success: true, position: 0, hasProgress: false };
        }

        return {
            success: true,
            position: progress.last_position,
            totalWatchTime: progress.total_watch_time,
            watchCount: progress.watch_count,
            completedCount: progress.completed_count,
            lastWatched: progress.last_watched,
            hasProgress: progress.last_position > 0
        };
    } catch (error) {
        console.error('[History] Error al obtener última posición:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene videos para "Continuar viendo" (progreso entre 5% y 95%)
 */
function getContinueWatching(limit = 10) {
    try {
        const db = getDatabase();
        const stmt = db.prepare(`
      SELECT 
        v.*,
        wp.last_position,
        wp.last_watched,
        wp.total_watch_time,
        wp.watch_count,
        CASE 
          WHEN v.duration > 0 THEN ROUND((wp.last_position * 1.0 / v.duration) * 100, 1)
          ELSE 0 
        END as progress_percentage
      FROM watch_progress wp
      JOIN videos v ON v.id = wp.video_id
      WHERE wp.last_position > 0
        AND v.duration > 0
        AND (wp.last_position * 1.0 / v.duration) >= 0.05
        AND (wp.last_position * 1.0 / v.duration) < 0.95
        AND v.is_available = 1
      ORDER BY wp.last_watched DESC
      LIMIT ?
    `);

        const videos = stmt.all(limit);

        return {
            success: true,
            videos,
            count: videos.length
        };
    } catch (error) {
        console.error('[History] Error al obtener continuar viendo:', error);
        return { success: false, error: error.message, videos: [] };
    }
}

/**
 * Marca un video como visto (completado) manualmente
 */
function markAsWatched(videoId) {
    try {
        const db = getDatabase();

        // Obtener duración del video
        const videoStmt = db.prepare('SELECT duration FROM videos WHERE id = ?');
        const video = videoStmt.get(videoId);
        const duration = video?.duration || 0;

        // Actualizar progreso al 100%
        const progressStmt = db.prepare(`
      INSERT INTO watch_progress (video_id, last_position, last_watched, completed_count, watch_count)
      VALUES (?, ?, CURRENT_TIMESTAMP, 1, 1)
      ON CONFLICT(video_id) DO UPDATE SET
        last_position = ?,
        last_watched = CURRENT_TIMESTAMP,
        completed_count = completed_count + 1
    `);
        progressStmt.run(videoId, duration, duration);

        // Registrar en historial como completado
        const sessionId = getCurrentSessionId();
        const historyStmt = db.prepare(`
      INSERT INTO watch_history (video_id, progress_seconds, duration_seconds, percentage_watched, completed, session_id)
      VALUES (?, ?, ?, 100, 1, ?)
    `);
        historyStmt.run(videoId, duration, duration, sessionId);

        console.log(`[History] Video ${videoId} marcado como visto`);

        return { success: true };
    } catch (error) {
        console.error('[History] Error al marcar como visto:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Limpia el progreso de un video específico
 */
function clearProgress(videoId) {
    try {
        const db = getDatabase();
        const stmt = db.prepare('DELETE FROM watch_progress WHERE video_id = ?');
        stmt.run(videoId);

        console.log(`[History] Progreso limpiado para video ${videoId}`);

        return { success: true };
    } catch (error) {
        console.error('[History] Error al limpiar progreso:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene todo el historial paginado
 */
function getAll(page = 1, limit = 50) {
    try {
        const db = getDatabase();
        const offset = (page - 1) * limit;

        // Contar total
        const countStmt = db.prepare('SELECT COUNT(*) as total FROM watch_history');
        const { total } = countStmt.get();

        // Obtener historial con información del video
        const stmt = db.prepare(`
      SELECT 
        wh.*,
        v.title,
        v.filename,
        v.filepath,
        v.duration,
        v.thumbnail
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      ORDER BY wh.watched_at DESC
      LIMIT ? OFFSET ?
    `);

        const history = stmt.all(limit, offset);

        return {
            success: true,
            history,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + history.length < total
            }
        };
    } catch (error) {
        console.error('[History] Error al obtener historial:', error);
        return { success: false, error: error.message, history: [] };
    }
}

/**
 * Obtiene historial filtrado por rango de fechas
 */
function getByDateRange(startDate, endDate, page = 1, limit = 50) {
    try {
        const db = getDatabase();
        const offset = (page - 1) * limit;

        // Contar total en rango
        const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM watch_history 
      WHERE watched_at >= ? AND watched_at <= ?
    `);
        const { total } = countStmt.get(startDate, endDate);

        // Obtener historial
        const stmt = db.prepare(`
      SELECT 
        wh.*,
        v.title,
        v.filename,
        v.filepath,
        v.duration,
        v.thumbnail
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      WHERE wh.watched_at >= ? AND wh.watched_at <= ?
      ORDER BY wh.watched_at DESC
      LIMIT ? OFFSET ?
    `);

        const history = stmt.all(startDate, endDate, limit, offset);

        return {
            success: true,
            history,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + history.length < total
            },
            dateRange: { startDate, endDate }
        };
    } catch (error) {
        console.error('[History] Error al obtener historial por fechas:', error);
        return { success: false, error: error.message, history: [] };
    }
}

/**
 * Busca en el historial por título de video
 */
function search(query, page = 1, limit = 50) {
    try {
        const db = getDatabase();
        const offset = (page - 1) * limit;
        const searchPattern = `%${query}%`;

        // Contar resultados
        const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      WHERE v.title LIKE ? OR v.filename LIKE ?
    `);
        const { total } = countStmt.get(searchPattern, searchPattern);

        // Buscar
        const stmt = db.prepare(`
      SELECT 
        wh.*,
        v.title,
        v.filename,
        v.filepath,
        v.duration,
        v.thumbnail
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      WHERE v.title LIKE ? OR v.filename LIKE ?
      ORDER BY wh.watched_at DESC
      LIMIT ? OFFSET ?
    `);

        const history = stmt.all(searchPattern, searchPattern, limit, offset);

        return {
            success: true,
            history,
            query,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + history.length < total
            }
        };
    } catch (error) {
        console.error('[History] Error al buscar en historial:', error);
        return { success: false, error: error.message, history: [] };
    }
}

/**
 * Elimina una entrada específica del historial
 */
function deleteEntry(historyId) {
    try {
        const db = getDatabase();
        const stmt = db.prepare('DELETE FROM watch_history WHERE id = ?');
        const result = stmt.run(historyId);

        console.log(`[History] Entrada ${historyId} eliminada`);

        return {
            success: true,
            deleted: result.changes > 0
        };
    } catch (error) {
        console.error('[History] Error al eliminar entrada:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Limpia todo el historial
 */
function clearAll() {
    try {
        const db = getDatabase();
        db.exec('DELETE FROM watch_history');
        db.exec('DELETE FROM watch_progress');

        console.log('[History] Todo el historial ha sido limpiado');

        return { success: true };
    } catch (error) {
        console.error('[History] Error al limpiar historial:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene estadísticas de visualización
 */
function getWatchStats() {
    try {
        const db = getDatabase();

        // Estadísticas generales
        const generalStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_watches,
        COUNT(DISTINCT video_id) as unique_videos,
        SUM(progress_seconds) as total_seconds_watched,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_watches,
        AVG(percentage_watched) as avg_percentage
      FROM watch_history
    `);
        const general = generalStmt.get();

        // Estadísticas por día de la semana
        const byDayStmt = db.prepare(`
      SELECT 
        CAST(strftime('%w', watched_at) AS INTEGER) as day_of_week,
        COUNT(*) as count
      FROM watch_history
      GROUP BY day_of_week
      ORDER BY day_of_week
    `);
        const byDay = byDayStmt.all();

        // Estadísticas por hora del día
        const byHourStmt = db.prepare(`
      SELECT 
        CAST(strftime('%H', watched_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM watch_history
      GROUP BY hour
      ORDER BY hour
    `);
        const byHour = byHourStmt.all();

        // Videos más vistos
        const topVideosStmt = db.prepare(`
      SELECT 
        v.id,
        v.title,
        v.thumbnail,
        COUNT(wh.id) as watch_count,
        SUM(wh.progress_seconds) as total_time_watched
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      GROUP BY wh.video_id
      ORDER BY watch_count DESC
      LIMIT 10
    `);
        const topVideos = topVideosStmt.all();

        return {
            success: true,
            stats: {
                totalWatches: general.total_watches || 0,
                uniqueVideos: general.unique_videos || 0,
                totalSecondsWatched: general.total_seconds_watched || 0,
                totalHoursWatched: Math.round((general.total_seconds_watched || 0) / 3600 * 100) / 100,
                completedWatches: general.completed_watches || 0,
                avgPercentage: Math.round((general.avg_percentage || 0) * 100) / 100,
                completionRate: general.total_watches > 0
                    ? Math.round((general.completed_watches / general.total_watches) * 100)
                    : 0
            },
            byDayOfWeek: byDay,
            byHour: byHour,
            topVideos
        };
    } catch (error) {
        console.error('[History] Error al obtener estadísticas:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene estadísticas de la sesión actual
 */
function getSessionStats() {
    try {
        const db = getDatabase();
        const sessionId = getCurrentSessionId();

        const stmt = db.prepare(`
      SELECT 
        COUNT(*) as videos_watched,
        COUNT(DISTINCT video_id) as unique_videos,
        SUM(progress_seconds) as total_seconds,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
        MIN(watched_at) as session_start
      FROM watch_history
      WHERE session_id = ?
    `);

        const stats = stmt.get(sessionId);

        return {
            success: true,
            sessionId,
            stats: {
                videosWatched: stats.videos_watched || 0,
                uniqueVideos: stats.unique_videos || 0,
                totalSeconds: stats.total_seconds || 0,
                totalMinutes: Math.round((stats.total_seconds || 0) / 60),
                completed: stats.completed || 0,
                sessionStart: stats.session_start
            }
        };
    } catch (error) {
        console.error('[History] Error al obtener estadísticas de sesión:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el historial agrupado por fecha (para UI)
 */
function getGroupedByDate(days = 7) {
    try {
        const db = getDatabase();
        const stmt = db.prepare(`
      SELECT 
        DATE(wh.watched_at) as watch_date,
        wh.*,
        v.title,
        v.filename,
        v.filepath,
        v.duration,
        v.thumbnail
      FROM watch_history wh
      JOIN videos v ON v.id = wh.video_id
      WHERE wh.watched_at >= datetime('now', '-' || ? || ' days')
      ORDER BY wh.watched_at DESC
    `);

        const history = stmt.all(days);

        // Agrupar por fecha
        const grouped = {};
        history.forEach(item => {
            const date = item.watch_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });

        // Convertir a array ordenado
        const result = Object.entries(grouped).map(([date, items]) => ({
            date,
            items,
            count: items.length,
            totalSeconds: items.reduce((sum, item) => sum + (item.progress_seconds || 0), 0)
        }));

        return {
            success: true,
            grouped: result,
            totalDays: result.length,
            totalItems: history.length
        };
    } catch (error) {
        console.error('[History] Error al obtener historial agrupado:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Inicializa y registra los handlers IPC
 */
function initHistoryHandlers() {
    // Generar sesión al inicializar
    generateSessionId();
    console.log(`[History] Nueva sesión iniciada: ${currentSessionId}`);

    // Registro de reproducción
    ipcMain.handle('history:recordWatch', (_, videoId, durationSeconds) => {
        return recordWatch(videoId, durationSeconds);
    });

    ipcMain.handle('history:updateProgress', (_, videoId, progressSeconds, durationSeconds) => {
        return updateProgress(videoId, progressSeconds, durationSeconds);
    });

    // Continuar viendo
    ipcMain.handle('history:getContinueWatching', (_, limit) => {
        return getContinueWatching(limit);
    });

    ipcMain.handle('history:getLastPosition', (_, videoId) => {
        return getLastPosition(videoId);
    });

    ipcMain.handle('history:markAsWatched', (_, videoId) => {
        return markAsWatched(videoId);
    });

    ipcMain.handle('history:clearProgress', (_, videoId) => {
        return clearProgress(videoId);
    });

    // Historial
    ipcMain.handle('history:getAll', (_, page, limit) => {
        return getAll(page, limit);
    });

    ipcMain.handle('history:getByDateRange', (_, startDate, endDate, page, limit) => {
        return getByDateRange(startDate, endDate, page, limit);
    });

    ipcMain.handle('history:search', (_, query, page, limit) => {
        return search(query, page, limit);
    });

    ipcMain.handle('history:deleteEntry', (_, historyId) => {
        return deleteEntry(historyId);
    });

    ipcMain.handle('history:clearAll', () => {
        return clearAll();
    });

    // Estadísticas
    ipcMain.handle('history:getWatchStats', () => {
        return getWatchStats();
    });

    ipcMain.handle('history:getSessionStats', () => {
        return getSessionStats();
    });

    ipcMain.handle('history:getGroupedByDate', (_, days) => {
        return getGroupedByDate(days);
    });

    // Utilidades
    ipcMain.handle('history:newSession', () => {
        return { success: true, sessionId: generateSessionId() };
    });

    ipcMain.handle('history:getCurrentSession', () => {
        return { success: true, sessionId: getCurrentSessionId() };
    });

    console.log('[History] ✅ Handlers IPC registrados (15 endpoints)');
}

module.exports = {
    initHistoryHandlers
};