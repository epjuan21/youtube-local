const { ipcMain, dialog } = require('electron');
const { getDatabase } = require('../database');
const path = require('path');
const fs = require('fs');

function setupVideoHandlers() {
    // Obtener todos los videos
    ipcMain.handle('get-videos', async (event, filters = {}) => {
        const db = getDatabase();
        let query = 'SELECT * FROM videos';
        const conditions = [];
        const params = [];

        // Filtrar por disponibilidad
        if (filters.onlyAvailable !== false) {
            conditions.push('is_available = 1');
        }

        // Filtrar por búsqueda
        if (filters.search) {
            conditions.push('(title LIKE ? OR description LIKE ?)');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY upload_date DESC';

        const videos = db.prepare(query).all(...params);
        return videos;
    });

    // Obtener video por ID (SIN incrementar vistas)
    ipcMain.handle('get-video-by-id', async (event, id) => {
        const db = getDatabase();
        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        return video;
    });

    // Incrementar vista de un video
    ipcMain.handle('increment-video-view', async (event, id) => {
        const db = getDatabase();
        db.prepare('UPDATE videos SET views = views + 1, last_watched = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        return video;
    });

    // Actualizar video
    ipcMain.handle('update-video', async (event, id, videoData) => {
        const db = getDatabase();
        const stmt = db.prepare(`
      UPDATE videos 
      SET title = COALESCE(?, title), 
          description = COALESCE(?, description), 
          likes = COALESCE(?, likes),
          dislikes = COALESCE(?, dislikes)
      WHERE id = ?
    `);

        stmt.run(
            videoData.title || null,
            videoData.description || null,
            videoData.likes !== undefined ? videoData.likes : null,
            videoData.dislikes !== undefined ? videoData.dislikes : null,
            id
        );

        return { id, ...videoData };
    });

    // Incrementar tiempo de visualización
    ipcMain.handle('update-watch-time', async (event, id, seconds) => {
        const db = getDatabase();
        db.prepare('UPDATE videos SET watch_time = watch_time + ? WHERE id = ?').run(seconds, id);
        return { success: true };
    });

    // Obtener estadísticas
    ipcMain.handle('get-video-stats', async () => {
        const db = getDatabase();
        const stats = {
            total: db.prepare('SELECT COUNT(*) as count FROM videos').get().count,
            available: db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_available = 1').get().count,
            unavailable: db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_available = 0').get().count,
            totalViews: db.prepare('SELECT SUM(views) as total FROM videos').get().total || 0,
            totalWatchTime: db.prepare('SELECT SUM(watch_time) as total FROM videos').get().total || 0
        };
        return stats;
    });
}

module.exports = { setupVideoHandlers };