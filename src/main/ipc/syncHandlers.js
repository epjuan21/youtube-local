const { ipcMain, dialog } = require('electron');
const { getDatabase } = require('../database');
const { scanWatchFolder } = require('../scanner');
const { startWatching, stopWatching } = require('../fileWatcher');
const fs = require('fs');
const path = require('path');
const { detectReconnectedDisks } = require('../diskDetection');
const { getDiskIdentifier, getMountPoint, getRelativePath } = require('../diskUtils');

/**
 * Detecta si una ruta es la raíz de una unidad/disco
 * @param {string} folderPath - Ruta a verificar
 * @returns {boolean}
 */
function isDriveRoot(folderPath) {
    const normalized = path.normalize(folderPath);
    const platform = process.platform;

    if (platform === 'win32') {
        // Windows: C:\, D:\, F:\, etc.
        return /^[A-Za-z]:\\?$/.test(normalized);
    } else {
        // Linux/macOS: /media/user/disk, /mnt/disk, /Volumes/disk
        const mountPrefixes = ['/media/', '/mnt/', '/Volumes/', '/run/media/'];
        
        for (const prefix of mountPrefixes) {
            if (normalized.startsWith(prefix)) {
                // Contar cuántos niveles de profundidad tiene después del prefijo
                const afterPrefix = normalized.replace(prefix, '');
                const parts = afterPrefix.split('/').filter(p => p.length > 0);
                // Si solo tiene 1-2 partes, es probablemente la raíz del disco
                return parts.length <= 2;
            }
        }
        
        return false;
    }
}

/**
 * Obtiene las subcarpetas de primer nivel de una ruta
 * @param {string} folderPath - Ruta del directorio
 * @returns {Promise<string[]>} - Array de rutas completas de subcarpetas
 */
async function getFirstLevelSubfolders(folderPath) {
    const subfolders = [];

    try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });

        for (const entry of entries) {
            // Ignorar archivos ocultos y carpetas del sistema
            if (entry.name.startsWith('.') || 
                entry.name.startsWith('$') ||
                entry.name === 'System Volume Information' ||
                entry.name === 'RECYCLER' ||
                entry.name === '$RECYCLE.BIN') {
                continue;
            }

            if (entry.isDirectory()) {
                const fullPath = path.join(folderPath, entry.name);
                subfolders.push(fullPath);
            }
        }
    } catch (error) {
        console.error('Error leyendo subcarpetas:', error);
    }

    // Ordenar alfabéticamente
    return subfolders.sort((a, b) => 
        path.basename(a).localeCompare(path.basename(b))
    );
}

/**
 * Agrega una carpeta individual (función interna reutilizable)
 * @returns {Promise<{folder: object, isNew: boolean, error?: string}>}
 */
async function addSingleFolder(folderPath, mainWindow, skipScan = false) {
    if (!fs.existsSync(folderPath)) {
        return { folder: null, isNew: false, error: 'La carpeta no existe' };
    }

    const db = getDatabase();

    try {
        // Detectar información del disco
        const diskIdentifier = await getDiskIdentifier(folderPath);
        const mountPoint = await getMountPoint(folderPath);
        const relativePath = getRelativePath(folderPath, mountPoint);

        // Verificar si ya existe
        const existing = db.prepare(`
            SELECT * FROM watch_folders 
            WHERE disk_identifier = ? AND relative_path = ?
        `).get(diskIdentifier, relativePath);

        if (existing) {
            // Actualizar rutas si cambiaron
            if (existing.folder_path !== folderPath || existing.disk_mount_point !== mountPoint) {
                db.prepare(`
                    UPDATE watch_folders 
                    SET folder_path = ?, 
                        disk_mount_point = ?,
                        is_active = 1
                    WHERE id = ?
                `).run(folderPath, mountPoint, existing.id);
            }

            return { folder: existing, isNew: false };
        }

        // Insertar nueva carpeta
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

        // Iniciar monitoreo
        startWatching(folder, mainWindow);

        // Escanear automáticamente si no se especifica lo contrario
        if (!skipScan) {
            setImmediate(async () => {
                try {
                    const stats = await scanWatchFolder(folder.id, (data) => {
                        mainWindow.webContents.send('sync-progress', data);
                    });

                    mainWindow.webContents.send('sync-complete', {
                        folderId: folder.id,
                        stats: stats
                    });
                } catch (err) {
                    console.error('Error en escaneo automático:', err);
                    mainWindow.webContents.send('sync-error', {
                        folderId: folder.id,
                        error: err.message
                    });
                }
            });
        }

        return { folder, isNew: true };

    } catch (error) {
        return { folder: null, isNew: false, error: error.message };
    }
}

function setupSyncHandlers(mainWindow) {
    // =====================================================
    // NUEVO: Agregar carpetas en lote desde unidad/disco
    // =====================================================
    ipcMain.handle('add-watch-folder-bulk', async (event, folderPath) => {
        console.log(`\n📀 IMPORTACIÓN EN LOTE INICIADA`);
        console.log(`   Ruta seleccionada: ${folderPath}`);

        if (!fs.existsSync(folderPath)) {
            throw new Error('La ruta no existe');
        }

        const isRoot = isDriveRoot(folderPath);
        console.log(`   ¿Es raíz de unidad?: ${isRoot}`);

        // Si NO es raíz de unidad, usar el método normal
        if (!isRoot) {
            console.log(`   → Usando método estándar (no es raíz)`);
            const result = await addSingleFolder(folderPath, mainWindow, false);
            
            if (result.error) {
                throw new Error(result.error);
            }

            return {
                mode: 'single',
                totalFolders: 1,
                foldersAdded: result.isNew ? 1 : 0,
                foldersUpdated: result.isNew ? 0 : 1,
                foldersSkipped: 0,
                errors: [],
                folders: [result.folder]
            };
        }

        // ES raíz de unidad - importar subcarpetas
        console.log(`   → Modo BULK: Importando subcarpetas de primer nivel`);

        const subfolders = await getFirstLevelSubfolders(folderPath);
        const totalFolders = subfolders.length;

        console.log(`   📁 Subcarpetas encontradas: ${totalFolders}`);

        if (totalFolders === 0) {
            return {
                mode: 'bulk',
                totalFolders: 0,
                foldersAdded: 0,
                foldersUpdated: 0,
                foldersSkipped: 0,
                errors: [],
                folders: [],
                message: 'No se encontraron subcarpetas en la unidad'
            };
        }

        // Enviar evento inicial
        mainWindow.webContents.send('bulk-import-start', {
            totalFolders,
            drivePath: folderPath
        });

        const results = {
            mode: 'bulk',
            totalFolders,
            foldersAdded: 0,
            foldersUpdated: 0,
            foldersSkipped: 0,
            errors: [],
            folders: []
        };

        // Procesar cada subcarpeta
        for (let i = 0; i < subfolders.length; i++) {
            const subfolder = subfolders[i];
            const folderName = path.basename(subfolder);
            const progress = Math.round(((i + 1) / totalFolders) * 100);

            console.log(`\n   [${i + 1}/${totalFolders}] Procesando: ${folderName}`);

            // Enviar progreso a UI
            mainWindow.webContents.send('bulk-import-progress', {
                current: i + 1,
                total: totalFolders,
                folderName,
                folderPath: subfolder,
                progress
            });

            try {
                // Agregar carpeta SIN escaneo automático (lo haremos después)
                const result = await addSingleFolder(subfolder, mainWindow, true);

                if (result.error) {
                    console.log(`      ❌ Error: ${result.error}`);
                    results.errors.push({ folder: subfolder, error: result.error });
                    results.foldersSkipped++;
                } else if (result.isNew) {
                    console.log(`      ✅ Nueva carpeta agregada (ID: ${result.folder.id})`);
                    results.foldersAdded++;
                    results.folders.push(result.folder);
                } else {
                    console.log(`      ⚠️ Carpeta ya existía (ID: ${result.folder.id})`);
                    results.foldersUpdated++;
                    results.folders.push(result.folder);
                }
            } catch (error) {
                console.log(`      ❌ Excepción: ${error.message}`);
                results.errors.push({ folder: subfolder, error: error.message });
                results.foldersSkipped++;
            }

            // Pequeña pausa para no saturar
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Enviar evento de finalización
        mainWindow.webContents.send('bulk-import-complete', results);

        console.log(`\n📊 RESUMEN DE IMPORTACIÓN EN LOTE:`);
        console.log(`   Total procesadas: ${totalFolders}`);
        console.log(`   Nuevas: ${results.foldersAdded}`);
        console.log(`   Existentes: ${results.foldersUpdated}`);
        console.log(`   Errores: ${results.foldersSkipped}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Escanear todas las carpetas nuevas en segundo plano
        if (results.foldersAdded > 0) {
            console.log(`🔄 Iniciando escaneo de ${results.foldersAdded} carpetas nuevas...`);

            setImmediate(async () => {
                for (const folder of results.folders) {
                    if (folder && folder.id) {
                        try {
                            const stats = await scanWatchFolder(folder.id, (data) => {
                                mainWindow.webContents.send('sync-progress', {
                                    ...data,
                                    folderId: folder.id,
                                    folderName: path.basename(folder.folder_path)
                                });
                            });

                            console.log(`   ✅ Escaneado ${path.basename(folder.folder_path)}: ${stats.added} videos`);
                        } catch (err) {
                            console.error(`   ❌ Error escaneando ${folder.folder_path}:`, err.message);
                        }
                    }
                }

                // Notificar que el escaneo terminó
                mainWindow.webContents.send('bulk-scan-complete', {
                    foldersScanned: results.foldersAdded
                });
            });
        }

        return results;
    });

    // =====================================================
    // Agregar carpeta individual (método original)
    // =====================================================
    ipcMain.handle('add-watch-folder', async (event, folderPath) => {
        if (!fs.existsSync(folderPath)) {
            throw new Error('La carpeta no existe');
        }

        const db = getDatabase();

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

        // Insertar con toda la información del disco
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

        // Escanear automáticamente la carpeta
        console.log(`📂 Nueva carpeta agregada: ${folderPath}`);
        console.log(`🔄 Iniciando escaneo automático...`);

        setImmediate(async () => {
            try {
                const stats = await scanWatchFolder(folder.id, (data) => {
                    mainWindow.webContents.send('sync-progress', data);
                });

                console.log(`✅ Escaneo automático completado: ${stats.added} videos agregados`);

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

        try {
            const folder = db.prepare('SELECT * FROM watch_folders WHERE id = ?').get(id);

            if (!folder) {
                console.error(`❌ Carpeta ${id} no encontrada`);
                throw new Error(`Carpeta con ID ${id} no encontrada`);
            }

            console.log(`📁 Carpeta: ${folder.folder_path}`);

            const videos = db.prepare('SELECT * FROM videos WHERE watch_folder_id = ?').all(id);
            console.log(`📊 Videos encontrados: ${videos.length}`);

            // Eliminar thumbnails físicos
            let thumbnailsDeleted = 0;

            for (const video of videos) {
                if (video.thumbnail && fs.existsSync(video.thumbnail)) {
                    try {
                        fs.unlinkSync(video.thumbnail);
                        thumbnailsDeleted++;
                        console.log(`  ✔ Thumbnail: ${path.basename(video.thumbnail)}`);
                    } catch (err) {
                        console.error(`  ✗ Error thumbnail: ${err.message}`);
                    }
                }
            }

            console.log(`✔ Thumbnails eliminados: ${thumbnailsDeleted}`);

            // Detener monitoreo
            try {
                stopWatching(id);
                console.log('✔ Monitoreo detenido');
            } catch (err) {
                console.warn('⚠️  Warning: ', err.message);
            }

            // ORDEN CRÍTICO DE ELIMINACIÓN

            // 1. Eliminar relaciones video_categories
            console.log('\n📋 Paso 1: Eliminando relaciones de categorías...');
            const catResult = db.prepare(`
                DELETE FROM video_categories 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✔ Relaciones eliminadas: ${catResult.changes}`);

            // 2. Eliminar relaciones video_tags
            console.log('\n📋 Paso 2: Eliminando relaciones de tags...');
            const tagsResult = db.prepare(`
                DELETE FROM video_tags 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✔ Relaciones eliminadas: ${tagsResult.changes}`);

            // 3. Eliminar relaciones playlist_videos
            console.log('\n📋 Paso 3: Eliminando relaciones de playlists...');
            const playlistResult = db.prepare(`
                DELETE FROM playlist_videos 
                WHERE video_id IN (SELECT id FROM videos WHERE watch_folder_id = ?)
            `).run(id);
            console.log(`✔ Relaciones eliminadas: ${playlistResult.changes}`);

            // 4. Eliminar sync_history
            console.log('\n📋 Paso 4: Eliminando historial de sincronización...');
            const syncResult = db.prepare(`
                DELETE FROM sync_history 
                WHERE watch_folder_id = ?
            `).run(id);
            console.log(`✔ Historial eliminado: ${syncResult.changes}`);

            // 5. Eliminar videos
            console.log('\n📋 Paso 5: Eliminando videos...');
            const videosResult = db.prepare(`
                DELETE FROM videos 
                WHERE watch_folder_id = ?
            `).run(id);
            console.log(`✔ Videos eliminados: ${videosResult.changes}`);

            // 6. Eliminar la carpeta
            console.log('\n📋 Paso 6: Eliminando carpeta...');
            const folderResult = db.prepare(`
                DELETE FROM watch_folders 
                WHERE id = ?
            `).run(id);
            console.log(`✔ Carpeta eliminada: ${folderResult.changes}`);

            console.log('\n✅ Eliminación completada exitosamente');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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