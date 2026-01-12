// src/main/ipc/statsHandlers.js
// Sistema de Estadísticas de Biblioteca - Fase 4
// Proporciona métricas generales de la colección de videos

const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

/**
 * Obtiene estadísticas generales de la biblioteca
 * Incluye totales, promedios y métricas de espacio
 */
function getOverview() {
    try {
        const db = getDatabase();

        // Estadísticas generales de videos
        const videoStats = db.prepare(`
            SELECT
                COUNT(*) as total_videos,
                SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as available_videos,
                SUM(views) as total_views,
                SUM(duration) as total_duration,
                SUM(file_size) as total_size,
                AVG(CASE WHEN rating > 0 THEN rating ELSE NULL END) as avg_rating,
                MAX(upload_date) as last_added
            FROM videos
        `).get();

        // Contar categorías y tags únicos usados
        const categoriesCount = db.prepare(`
            SELECT COUNT(DISTINCT category_id) as count FROM video_categories
        `).get();

        const tagsCount = db.prepare(`
            SELECT COUNT(DISTINCT tag_id) as count FROM video_tags
        `).get();

        // Contar playlists
        const playlistsCount = db.prepare(`
            SELECT COUNT(*) as count FROM playlists
        `).get();

        // Calcular tiempo formateado
        const totalSeconds = videoStats.total_duration || 0;
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

        // Calcular tamaño formateado
        const totalBytes = videoStats.total_size || 0;
        const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

        return {
            success: true,
            overview: {
                totalVideos: videoStats.total_videos || 0,
                availableVideos: videoStats.available_videos || 0,
                unavailableVideos: (videoStats.total_videos || 0) - (videoStats.available_videos || 0),
                totalViews: videoStats.total_views || 0,
                totalDuration: totalSeconds,
                totalDurationFormatted: totalHours > 0
                    ? `${totalHours}h ${totalMinutes}m`
                    : `${totalMinutes}m`,
                totalSize: totalBytes,
                totalSizeFormatted: `${totalGB} GB`,
                avgRating: videoStats.avg_rating
                    ? Math.round(videoStats.avg_rating * 10) / 10
                    : null,
                lastAdded: videoStats.last_added,
                categoriesUsed: categoriesCount.count || 0,
                tagsUsed: tagsCount.count || 0,
                playlistsCount: playlistsCount.count || 0
            }
        };
    } catch (error) {
        console.error('[Stats] Error al obtener overview:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene los videos mejor valorados
 */
function getTopRated(limit = 10) {
    try {
        const db = getDatabase();

        const videos = db.prepare(`
            SELECT id, title, filename, thumbnail, rating, views, duration
            FROM videos
            WHERE rating > 0 AND is_available = 1
            ORDER BY rating DESC, views DESC
            LIMIT ?
        `).all(limit);

        return {
            success: true,
            videos
        };
    } catch (error) {
        console.error('[Stats] Error al obtener top rated:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene los videos agregados recientemente
 */
function getRecentlyAdded(limit = 10) {
    try {
        const db = getDatabase();

        const videos = db.prepare(`
            SELECT id, title, filename, thumbnail, upload_date, duration, views
            FROM videos
            WHERE is_available = 1
            ORDER BY upload_date DESC
            LIMIT ?
        `).all(limit);

        return {
            success: true,
            videos
        };
    } catch (error) {
        console.error('[Stats] Error al obtener recientes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene distribución de videos por categoría
 */
function getCategoryDistribution() {
    try {
        const db = getDatabase();

        const distribution = db.prepare(`
            SELECT
                c.id,
                c.name,
                c.color,
                COUNT(vc.video_id) as video_count
            FROM categories c
            LEFT JOIN video_categories vc ON c.id = vc.category_id
            GROUP BY c.id
            ORDER BY video_count DESC
        `).all();

        // Contar videos sin categoría
        const uncategorized = db.prepare(`
            SELECT COUNT(*) as count
            FROM videos v
            WHERE NOT EXISTS (
                SELECT 1 FROM video_categories vc WHERE vc.video_id = v.id
            )
        `).get();

        return {
            success: true,
            distribution,
            uncategorizedCount: uncategorized.count || 0
        };
    } catch (error) {
        console.error('[Stats] Error al obtener distribución:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Inicializa y registra los handlers IPC de estadísticas
 */
function initStatsHandlers() {
    ipcMain.handle('stats:getOverview', () => {
        return getOverview();
    });

    ipcMain.handle('stats:getTopRated', (_, limit) => {
        return getTopRated(limit);
    });

    ipcMain.handle('stats:getRecentlyAdded', (_, limit) => {
        return getRecentlyAdded(limit);
    });

    ipcMain.handle('stats:getCategoryDistribution', () => {
        return getCategoryDistribution();
    });

    console.log('[Stats] Handlers IPC registrados (4 endpoints)');
}

module.exports = {
    initStatsHandlers
};
