const { ipcMain, dialog } = require('electron');
const { getDatabase } = require('../database');
const { scanWatchFolder } = require('../scanner');
const { startWatching, stopWatching } = require('../fileWatcher');
const fs = require('fs');
// ====== IMPORT NUEVO PARA DETECCIÓN DE DISCOS ======
const { detectReconnectedDisks } = require('../diskDetection');

function setupSyncHandlers(mainWindow) {
    // Agregar carpeta a monitorear
    ipcMain.handle('add-watch-folder', async (event, folderPath) => {
        if (!fs.existsSync(folderPath)) {
            throw new Error('La carpeta no existe');
        }

        const db = getDatabase();

        // Verificar si ya existe
        const existing = db.prepare('SELECT * FROM watch_folders WHERE folder_path = ?').get(folderPath);
        if (existing) {
            return existing;
        }

        const result = db.prepare('INSERT INTO watch_folders (folder_path) VALUES (?)')
            .run(folderPath);

        const folder = { id: result.lastInsertRowid, folder_path: folderPath, is_active: 1 };

        // Iniciar monitoreo
        startWatching(folder, mainWindow);

        return folder;
    });

    // Obtener carpetas monitoreadas
    ipcMain.handle('get-watch-folders', async () => {
        const db = getDatabase();
        return db.prepare('SELECT * FROM watch_folders ORDER BY created_date DESC').all();
    });

    // Eliminar carpeta
    ipcMain.handle('remove-watch-folder', async (event, id) => {
        const db = getDatabase();
        const fs = require('fs');
        const path = require('path');
        const { getThumbnailsDirectory } = require('../thumbnailGenerator');

        try {
            // Obtener todos los videos de esta carpeta antes de eliminar
            const videos = db.prepare('SELECT * FROM videos WHERE watch_folder_id = ?').all(id);

            // Eliminar thumbnails físicos de cada video
            const thumbnailsDir = getThumbnailsDirectory();
            let thumbnailsDeleted = 0;

            videos.forEach(video => {
                if (video.thumbnail && fs.existsSync(video.thumbnail)) {
                    try {
                        fs.unlinkSync(video.thumbnail);
                        thumbnailsDeleted++;
                        console.log(`🗑️  Thumbnail eliminado: ${path.basename(video.thumbnail)}`);
                    } catch (err) {
                        console.error(`Error eliminando thumbnail ${video.thumbnail}:`, err);
                    }
                }
            });

            console.log(`📊 Total de thumbnails eliminados: ${thumbnailsDeleted}`);

            // Detener monitoreo de Chokidar
            stopWatching(id);

            // ELIMINAR COMPLETAMENTE los videos y datos relacionados
            // Las relaciones se eliminan automáticamente por ON DELETE CASCADE
            db.prepare('DELETE FROM videos WHERE watch_folder_id = ?').run(id);

            // Eliminar la carpeta de watch_folders
            db.prepare('DELETE FROM watch_folders WHERE id = ?').run(id);

            console.log(`✅ Carpeta ${id} eliminada completamente con ${videos.length} videos`);

            return {
                success: true,
                videosDeleted: videos.length,
                thumbnailsDeleted: thumbnailsDeleted
            };
        } catch (error) {
            console.error('Error eliminando carpeta:', error);
            throw error;
        }
    });

    // Escanear carpeta específica
    ipcMain.handle('scan-folder', async (event, folderId) => {
        const onProgress = (data) => {
            mainWindow.webContents.send('sync-progress', data);
        };

        try {
            const stats = await scanWatchFolder(folderId, onProgress);
            mainWindow.webContents.send('sync-complete', { folderId, stats });
            return stats;
        } catch (err) {
            console.error('Error escaneando carpeta:', err);
            throw err;
        }
    });

    // Escanear todas las carpetas
    ipcMain.handle('scan-all-folders', async () => {
        const db = getDatabase();
        const folders = db.prepare('SELECT * FROM watch_folders WHERE is_active = 1').all();

        const results = [];

        for (const folder of folders) {
            try {
                const stats = await scanWatchFolder(folder.id, (data) => {
                    mainWindow.webContents.send('sync-progress', { ...data, folderId: folder.id });
                });
                results.push({ folderId: folder.id, stats });
            } catch (err) {
                console.error(`Error escaneando carpeta ${folder.id}:`, err);
            }
        }

        mainWindow.webContents.send('sync-complete', { results });
        return results;
    });

    // Obtener historial de sincronización
    ipcMain.handle('get-sync-history', async () => {
        const db = getDatabase();
        return db.prepare(`
      SELECT sh.*, wf.folder_path 
      FROM sync_history sh
      JOIN watch_folders wf ON sh.watch_folder_id = wf.id
      ORDER BY sh.sync_date DESC
      LIMIT 50
    `).all();
    });

    // Seleccionar carpeta
    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    // Verificar si un video existe
    ipcMain.handle('check-video-exists', async (event, filepath) => {
        return fs.existsSync(filepath);
    });

    // ====== NUEVO: HANDLER PARA DETECCIÓN MANUAL DE DISCOS ======
    ipcMain.handle('detect-reconnected-disks', async () => {
        try {
            console.log('🔍 Iniciando detección manual de discos...');
            const stats = await detectReconnectedDisks(mainWindow);
            console.log('✅ Detección completada:', stats);
            return { success: true, stats };
        } catch (error) {
            console.error('❌ Error detectando discos:', error);
            return {
                success: false,
                error: error.message,
                stats: {
                    disksFound: 0,
                    foldersRestored: 0,
                    videosRestored: 0,
                    videosFailed: 0
                }
            };
        }
    });
    // ====== FIN NUEVO HANDLER ======
}

module.exports = { setupSyncHandlers };