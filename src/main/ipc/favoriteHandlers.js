const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

function setupFavoriteHandlers() {
    // Marcar/desmarcar como favorito (toggle)
    ipcMain.handle('favorite:toggle', async (event, videoId) => {
        const db = getDatabase();
        try {
            // Obtener estado actual
            const stmt = db.prepare('SELECT is_favorite FROM videos WHERE id = ?');
            stmt.bind([videoId]);
            const video = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();

            if (!video) {
                return { success: false, error: 'Video no encontrado' };
            }

            const newFavoriteState = video.is_favorite ? 0 : 1;

            // Actualizar estado
            db.run('UPDATE videos SET is_favorite = ? WHERE id = ?', [newFavoriteState, videoId]);

            return {
                success: true,
                videoId,
                isFavorite: newFavoriteState === 1
            };
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return { success: false, error: error.message };
        }
    });

    // Obtener todos los favoritos
    ipcMain.handle('favorite:getAll', async () => {
        const db = getDatabase();
        try {
            const stmt = db.prepare(`
        SELECT * FROM videos 
        WHERE is_favorite = 1 
        ORDER BY title ASC
      `);

            const favorites = [];
            while (stmt.step()) {
                favorites.push(stmt.getAsObject());
            }
            stmt.free();

            return favorites;
        } catch (error) {
            console.error('Error getting favorites:', error);
            throw error;
        }
    });

    // Obtener contador de favoritos
    ipcMain.handle('favorite:getCount', async () => {
        const db = getDatabase();
        try {
            const stmt = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_favorite = 1');
            const result = stmt.step() ? stmt.getAsObject() : { count: 0 };
            stmt.free();

            return result.count;
        } catch (error) {
            console.error('Error getting favorites count:', error);
            throw error;
        }
    });

    // Limpiar todos los favoritos
    ipcMain.handle('favorite:clearAll', async () => {
        const db = getDatabase();
        try {
            // Contar favoritos antes de limpiar
            const countStmt = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_favorite = 1');
            const result = countStmt.step() ? countStmt.getAsObject() : { count: 0 };
            countStmt.free();

            // Limpiar favoritos
            db.run('UPDATE videos SET is_favorite = 0 WHERE is_favorite = 1');

            return {
                success: true,
                count: result.count
            };
        } catch (error) {
            console.error('Error clearing favorites:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('⭐ Favorite handlers registrados');
}

module.exports = { setupFavoriteHandlers };