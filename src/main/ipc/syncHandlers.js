const { ipcMain, dialog } = require('electron');
const { getDatabase } = require('../database');
const { scanWatchFolder } = require('../scanner');
const { startWatching, stopWatching } = require('../fileWatcher');
const fs = require('fs');
const { detectReconnectedDisks } = require('../diskDetection');
const { getDiskIdentifier, getMountPoint, getRelativePath } = require('../diskUtils');

function setupSyncHandlers(mainWindow) {
    // Agregar carpeta a monitorear
    ipcMain.handle('add-watch-folder', async (event, folderPath) => {
        if (!fs.existsSync(folderPath)) {
            throw new Error('La carpeta no existe');
        }

        const db = getDatabase();

        // ✅ DETECTAR DISCO INMEDIATAMENTE
        console.log(`📂 Detectando información del disco para: ${folderPath}`);

        const diskIdentifier = await getDiskIdentifier(folderPath);
        const mountPoint = await getMountPoint(folderPath);
        const relativePath = getRelativePath(folderPath, mountPoint);

        console.log(`   Disk ID: ${diskIdentifier}`);
        console.log(`   Mount Point: ${mountPoint}`);
        console.log(`   Relative Path: ${relativePath}`);

        // Verificar si ya existe
        const existing = db.prepare(`
            SELECT * FROM watch_folders 
            WHERE disk_identifier = ? AND relative_path = ?
        `).get(diskIdentifier, relativePath);

        if (existing) {
            console.log(`⚠️  Esta carpeta ya existe en la base de datos (ID: ${existing.id})`);

            // Actualizar folder_path y mount_point si cambió
            if (existing.folder_path !== folderPath || existing.disk_mount_point !== mountPoint) {
                console.log(`   Actualizando rutas...`);
                db.prepare(`
                    UPDATE watch_folders 
                    SET folder_path = ?, 
                        disk_mount_point = ?,
                        is_active = 1
                    WHERE id = ?
                `).run(folderPath, mountPoint, existing.id);
            }

            return existing;
        }

        // ✅ INSERTAR CON TODA LA INFORMACIÓN DEL DISCO
        const result = db.prepare(`
            INSERT INTO watch_folders (
                folder_path, 
                disk_identifier, 
                disk_mount_point, 
                relative_path,
                is_active
            ) VALUES (?, ?, ?, ?, 1)
        `).run(folderPath, diskIdentifier, mountPoint, relativePath);

        const folder = {
            id: result.lastInsertRowid,
            folder_path: folderPath,
            disk_identifier: diskIdentifier,
            disk_mount_point: mountPoint,
            relative_path: relativePath,
            is_active: 1
        };

        console.log(`✅ Carpeta agregada con ID: ${folder.id}`);

        // Iniciar monitoreo
        startWatching(folder, mainWindow);

        // ✅ ESCANEAR AUTOMÁTICAMENTE LA CARPETA
        console.log(`📂 Nueva carpeta agregada: ${folderPath}`);
        console.log(`🔄 Iniciando escaneo automático...`);

        // Escanear en segundo plano sin bloquear la respuesta
        setImmediate(async () => {
            try {
                const stats = await scanWatchFolder(folder.id, (data) => {
                    mainWindow.webContents.send('sync-progress', data);
                });

                console.log(`✅ Escaneo automático completado: ${stats.added} videos agregados`);

                // Enviar evento de sincronización completa
                mainWindow.webContents.send('sync-complete', {
                    folderId: folder.id,
                    stats: stats
                });
            } catch (err) {
                console.error('❌ Error en escaneo automático:', err);
                mainWindow.webContents.send('sync-error', {
                    folderId: folder.id,
                    error: err.message
                });
            }
        });

        return folder;
    });

    // Obtener carpetas monitoreadas
    ipcMain.handle('get-watch-folders', async () => {
        const db = getDatabase();
        return db.prepare('SELECT * FROM watch_folders ORDER BY created_date DESC').all();
    });

    // Eliminar carpeta
    ipcMain.handle('remove-watch-folder', async (event, id) => {
        console.log(`\n🗑️  Iniciando eliminación de carpeta ID: ${id}`);

        const db = getDatabase();
        const path = require('path');

        try {
            // Verificar que la carpeta existe
            const folder = db.prepare('SELECT * FROM watch_folders WHERE id = ?').get(id);

            if (!folder) {
                console.error(`❌ Carpeta ${id} no encontrada`);
                throw new Error(`Carpeta con ID ${id} no encontrada`);
            }

            console.log(`📁 Carpeta: ${folder.folder_path}`);

            // Obtener todos los videos
            const videos = db.prepare('SELECT * FROM videos WHERE watch_folder_id = ?').all(id);
            console.log(`📊 Videos encontrados: ${videos.length}`);

            // Eliminar thumbnails físicos
            let thumbnailsDeleted = 0;

            for (const video of videos) {
                if (video.thumbnail && fs.existsSync(video.thumbnail)) {
                    try {
                        fs.unlinkSync(video.thumbnail);
                        thumbnailsDeleted++;
                        console.log(`  ✓ Thumbnail: ${path.basename(video.thumbnail)}`);
                    } catch (err) {
                        console.error(`  ✗ Error thumbnail: ${err.message}`);
                    }
                }
            }

            console.log(`✓ Thumbnails eliminados: ${thumbnailsDeleted}`);

            // Detener monitoreo
            try {
                stopWatching(id);
                console.log('✓ Monitoreo detenido');
            } catch (err) {
                console.warn('⚠️  Warning: ', err.message);
            }

            // ============================================
            // ORDEN CRÍTICO DE ELIMINACIÓN
            // ============================================

            // 1. Eliminar relaciones video_categories
            console.log('\n📋 Paso 1: Eliminando relaciones de categorías...');
            const catResult = db.prepare(`
                DELETE FROM video_categories 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✓ Relaciones eliminadas: ${catResult.changes}`);

            // 2. Eliminar relaciones video_tags
            console.log('\n📋 Paso 2: Eliminando relaciones de tags...');
            const tagsResult = db.prepare(`
                DELETE FROM video_tags 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✓ Relaciones eliminadas: ${tagsResult.changes}`);

            // 3. Eliminar relaciones playlist_videos
            console.log('\n📋 Paso 3: Eliminando relaciones de playlists...');
            const playlistResult = db.prepare(`
                DELETE FROM playlist_videos 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✓ Relaciones eliminadas: ${playlistResult.changes}`);

            // 4. Eliminar sync_history
            console.log('\n📋 Paso 4: Eliminando historial de sincronización...');
            const syncResult = db.prepare(`
                DELETE FROM sync_history 
                WHERE watch_folder_id = ?
            `).run(id);
            console.log(`✓ Historial eliminado: ${syncResult.changes}`);

            // 5. Eliminar videos (ahora sin restricciones FK)
            console.log('\n📋 Paso 5: Eliminando videos...');
            const videosResult = db.prepare(`
                DELETE FROM videos 
                WHERE watch_folder_id = ?
            `).run(id);
            console.log(`✓ Videos eliminados: ${videosResult.changes}`);

            // 6. Finalmente, eliminar la carpeta
            console.log('\n📋 Paso 6: Eliminando carpeta...');
            const folderResult = db.prepare(`
                DELETE FROM watch_folders 
                WHERE id = ?
            `).run(id);
            console.log(`✓ Carpeta eliminada: ${folderResult.changes}`);

            console.log('\n✅ Eliminación completada exitosamente');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            return {
                success: true,
                videosDeleted: videos.length,
                thumbnailsDeleted: thumbnailsDeleted
            };

        } catch (error) {
            console.error('\n❌ ERROR ELIMINANDO CARPETA:', error);
            console.error('Código:', error.code);
            console.error('Mensaje:', error.message);
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

        const hasChanges = results.some(r =>
            r.stats && (r.stats.added > 0 || r.stats.updated > 0 || r.stats.removed > 0)
        );

        if (hasChanges) {
            mainWindow.webContents.send('sync-complete', { results });
            console.log('✅ Evento sync-complete enviado con cambios');
        } else {
            console.log('⏭️  Sincronización sin cambios, no enviar evento');
        }

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

    // Detección manual de discos
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
}

module.exports = { setupSyncHandlers };