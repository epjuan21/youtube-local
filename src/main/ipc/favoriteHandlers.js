const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

function setupFavoriteHandlers() {
  // Marcar/desmarcar como favorito (toggle)
  ipcMain.handle('favorite:toggle', async (event, videoId) => {
    try {
      const db = getDatabase();
      
      // Obtener estado actual
      const video = db.prepare('SELECT is_favorite FROM videos WHERE id = ?').get(videoId);

      if (!video) {
        return { success: false, error: 'Video no encontrado' };
      }

      const newFavoriteState = video.is_favorite ? 0 : 1;

      // Actualizar estado
      db.prepare('UPDATE videos SET is_favorite = ? WHERE id = ?').run(newFavoriteState, videoId);

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
    try {
      const db = getDatabase();
      const favorites = db.prepare(`
        SELECT * FROM videos 
        WHERE is_favorite = 1 
        ORDER BY title ASC
      `).all();

      return favorites;
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw error;
    }
  });

  // Obtener contador de favoritos
  ipcMain.handle('favorite:getCount', async () => {
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_favorite = 1').get();
      return result.count;
    } catch (error) {
      console.error('Error getting favorites count:', error);
      throw error;
    }
  });

  // Limpiar todos los favoritos
  ipcMain.handle('favorite:clearAll', async () => {
    try {
      const db = getDatabase();
      
      // Contar favoritos antes de limpiar
      const result = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_favorite = 1').get();

      // Limpiar favoritos
      db.prepare('UPDATE videos SET is_favorite = 0 WHERE is_favorite = 1').run();

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