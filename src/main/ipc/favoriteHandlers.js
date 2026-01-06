/**
 * IPC Handlers para Sistema de Favoritos
 */

const { ipcMain } = require('electron');

function setupFavoriteHandlers(db) {
    /**
     * Marcar/desmarcar video como favorito
     */
    ipcMain.handle('toggle-favorite', async (event, videoId) => {
        try {
            // Obtener estado actual
            const video = db.prepare('SELECT is_favorite FROM videos WHERE id = ?').get(videoId);

            if (!video) {
                throw new Error('Video no encontrado');
            }

            // Invertir el estado
            const newState = video.is_favorite === 1 ? 0 : 1;

            // Actualizar en base de datos
            const stmt = db.prepare(`
                UPDATE videos 
                SET is_favorite = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);

            stmt.run(newState, videoId);

            return {
                success: true,
                videoId,
                isFavorite: newState === 1
            };
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    /**
     * Obtener todos los videos favoritos
     */
    ipcMain.handle('get-favorites', async (event) => {
        try {
            const stmt = db.prepare(`
                SELECT * FROM videos 
                WHERE is_favorite = 1 
                ORDER BY updated_at DESC
            `);

            const favorites = stmt.all();

            return favorites;
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    });

    /**
     * Obtener contador de favoritos
     */
    ipcMain.handle('get-favorites-count', async (event) => {
        try {
            const result = db.prepare(`
                SELECT COUNT(*) as count 
                FROM videos 
                WHERE is_favorite = 1
            `).get();

            return result.count || 0;
        } catch (error) {
            console.error('Error getting favorites count:', error);
            return 0;
        }
    });

    /**
     * Limpiar todos los favoritos (usar con precaución)
     */
    ipcMain.handle('clear-all-favorites', async (event) => {
        try {
            const stmt = db.prepare(`
                UPDATE videos 
                SET is_favorite = 0, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE is_favorite = 1
            `);

            const result = stmt.run();

            return {
                success: true,
                count: result.changes
            };
        } catch (error) {
            console.error('Error clearing favorites:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    console.log('✅ Favorite handlers registrados');
}

module.exports = { setupFavoriteHandlers };