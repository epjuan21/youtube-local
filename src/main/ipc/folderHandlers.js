const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

// Obtener todas las carpetas monitoreadas
ipcMain.handle('get-watch-folders', async () => {
  const db = getDatabase();
  const folders = db.prepare('SELECT * FROM watch_folders ORDER BY added_at DESC').all();
  return folders;
});

// Obtener carpeta por ID
ipcMain.handle('get-folder-by-id', async (event, folderId) => {
  const db = getDatabase();
  const folder = db.prepare('SELECT * FROM watch_folders WHERE id = ?').get(folderId);
  return folder;
});

// Agregar nueva carpeta a monitorear
ipcMain.handle('add-watch-folder', async (event, folderPath) => {
  const db = getDatabase();
  
  try {
    // Verificar si ya existe
    const exists = db.prepare('SELECT id FROM watch_folders WHERE folder_path = ?').get(folderPath);
    if (exists) {
      return { success: false, error: 'Esta carpeta ya está siendo monitoreada' };
    }

    // Insertar nueva carpeta
    const result = db.prepare(`
      INSERT INTO watch_folders (folder_path, is_active)
      VALUES (?, 1)
    `).run(folderPath);

    const newFolder = db.prepare('SELECT * FROM watch_folders WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, folder: newFolder };
  } catch (error) {
    console.error('Error al agregar carpeta:', error);
    return { success: false, error: error.message };
  }
});

// Activar/desactivar carpeta
ipcMain.handle('toggle-folder-active', async (event, folderId) => {
  const db = getDatabase();
  
  try {
    // Obtener estado actual
    const folder = db.prepare('SELECT is_active FROM watch_folders WHERE id = ?').get(folderId);
    if (!folder) {
      return { success: false, error: 'Carpeta no encontrada' };
    }

    // Cambiar estado
    const newState = folder.is_active ? 0 : 1;
    db.prepare('UPDATE watch_folders SET is_active = ? WHERE id = ?').run(newState, folderId);

    return { success: true, isActive: newState === 1 };
  } catch (error) {
    console.error('Error al cambiar estado de carpeta:', error);
    return { success: false, error: error.message };
  }
});

// Eliminar carpeta
ipcMain.handle('remove-watch-folder', async (event, folderId) => {
  const db = getDatabase();
  
  try {
    // Obtener videos asociados
    const videos = db.prepare('SELECT id FROM videos WHERE watch_folder_id = ?').all(folderId);

    // Eliminar videos asociados
    db.prepare('DELETE FROM videos WHERE watch_folder_id = ?').run(folderId);

    // Eliminar carpeta
    db.prepare('DELETE FROM watch_folders WHERE id = ?').run(folderId);

    return { success: true, videosDeleted: videos.length };
  } catch (error) {
    console.error('Error al eliminar carpeta:', error);
    return { success: false, error: error.message };
  }
});

// Actualizar última sincronización
ipcMain.handle('update-folder-last-scan', async (event, folderId) => {
  const db = getDatabase();
  
  try {
    db.prepare('UPDATE watch_folders SET last_scan = CURRENT_TIMESTAMP WHERE id = ?').run(folderId);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar última sincronización:', error);
    return { success: false, error: error.message };
  }
});

// Obtener estadísticas de carpeta
ipcMain.handle('get-folder-stats', async (event, folderId) => {
  const db = getDatabase();
  
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM videos WHERE watch_folder_id = ?').get(folderId).count,
      available: db.prepare('SELECT COUNT(*) as count FROM videos WHERE watch_folder_id = ? AND is_available = 1').get(folderId).count,
      unavailable: db.prepare('SELECT COUNT(*) as count FROM videos WHERE watch_folder_id = ? AND is_available = 0').get(folderId).count
    };
    return stats;
  } catch (error) {
    console.error('Error al obtener estadísticas de carpeta:', error);
    throw error;
  }
});

console.log('📁 Folder handlers registrados');