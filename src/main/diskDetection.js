const { getDatabase } = require('./database');
const { findDiskByIdentifier, reconstructFullPath } = require('./diskUtils');
const fs = require('fs');

/**
 * Detecta discos que fueron desconectados y ahora están reconectados
 * Restaura automáticamente los videos que estaban marcados como no disponibles
 * 
 * @param {Object} mainWindow - Ventana principal de Electron (para enviar eventos)
 * @returns {Promise<Object>} - Estadísticas de restauración
 */
async function detectReconnectedDisks(mainWindow = null) {
    const db = getDatabase();

    console.log('\n🔍 Buscando discos reconectados...');

    const stats = {
        disksFound: 0,
        foldersRestored: 0,
        videosRestored: 0,
        videosFailed: 0
    };

    // Obtener todas las carpetas con disk_identifier que tienen videos no disponibles
    const folders = db.prepare(`
        SELECT DISTINCT wf.* 
        FROM watch_folders wf
        JOIN videos v ON v.watch_folder_id = wf.id
        WHERE v.is_available = 0 
          AND wf.disk_identifier IS NOT NULL
    `).all();

    console.log(`   Carpetas con videos no disponibles: ${folders.length}`);

    for (const folder of folders) {
        try {
            console.log(`\n   📁 Verificando: ${folder.folder_path}`);
            console.log(`      Disk ID: ${folder.disk_identifier}`);

            // Buscar si el disco está montado
            const mountPoint = await findDiskByIdentifier(folder.disk_identifier);

            if (mountPoint) {
                console.log(`      ✅ Disco encontrado en: ${mountPoint}`);
                stats.disksFound++;

                // Reconstruir ruta completa de la carpeta
                const fullFolderPath = reconstructFullPath(mountPoint, folder.relative_filepath || '/');

                // Verificar si la carpeta existe
                if (fs.existsSync(fullFolderPath)) {
                    console.log(`      ✅ Carpeta accesible: ${fullFolderPath}`);

                    // Actualizar watch_folder
                    db.prepare(`
                        UPDATE watch_folders 
                        SET folder_path = ?, 
                            disk_mount_point = ?, 
                            is_active = 1
                        WHERE id = ?
                    `).run(fullFolderPath, mountPoint, folder.id);

                    stats.foldersRestored++;

                    // Obtener videos no disponibles de esta carpeta
                    const unavailableVideos = db.prepare(`
                        SELECT * FROM videos 
                        WHERE watch_folder_id = ? 
                          AND disk_identifier = ?
                          AND is_available = 0
                    `).all(folder.id, folder.disk_identifier);

                    console.log(`      Videos no disponibles: ${unavailableVideos.length}`);

                    // Restaurar cada video
                    for (const video of unavailableVideos) {
                        try {
                            // Reconstruir ruta completa del video
                            const fullVideoPath = reconstructFullPath(
                                mountPoint,
                                video.relative_filepath
                            );

                            // Verificar si el archivo existe
                            if (fs.existsSync(fullVideoPath)) {
                                // Restaurar video
                                db.prepare(`
                                    UPDATE videos 
                                    SET filepath = ?, 
                                        is_available = 1
                                    WHERE id = ?
                                `).run(fullVideoPath, video.id);

                                stats.videosRestored++;

                                // Notificar a la UI si está disponible
                                if (mainWindow) {
                                    mainWindow.webContents.send('video-restored', {
                                        videoId: video.id,
                                        filename: video.filename,
                                        newPath: fullVideoPath
                                    });
                                }
                            } else {
                                console.log(`      ⚠️ Video no encontrado: ${video.filename}`);
                                stats.videosFailed++;
                            }
                        } catch (videoError) {
                            console.error(`      ✗ Error restaurando video ${video.id}:`, videoError.message);
                            stats.videosFailed++;
                        }
                    }

                    console.log(`      ✅ Videos restaurados: ${stats.videosRestored}`);

                    // Notificar a la UI
                    if (mainWindow) {
                        mainWindow.webContents.send('disk-reconnected', {
                            folderId: folder.id,
                            folderPath: fullFolderPath,
                            videosRestored: unavailableVideos.length
                        });
                    }
                } else {
                    console.log(`      ⚠️ Carpeta no encontrada en: ${fullFolderPath}`);
                }
            } else {
                console.log(`      ⚠️ Disco no está montado`);
            }
        } catch (folderError) {
            console.error(`   ✗ Error procesando carpeta ${folder.id}:`, folderError.message);
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE DETECCIÓN');
    console.log(`   Discos encontrados: ${stats.disksFound}`);
    console.log(`   Carpetas restauradas: ${stats.foldersRestored}`);
    console.log(`   Videos restaurados: ${stats.videosRestored}`);
    console.log(`   Videos no encontrados: ${stats.videosFailed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return stats;
}

/**
 * Verifica periódicamente si hay discos reconectados
 * Se ejecuta cada X minutos en background
 */
function startPeriodicDiskDetection(mainWindow, intervalMinutes = 5) {
    console.log(`🔄 Iniciando detección periódica de discos (cada ${intervalMinutes} minutos)`);

    // Ejecutar inmediatamente al iniciar
    detectReconnectedDisks(mainWindow).catch(err => {
        console.error('Error en detección inicial de discos:', err);
    });

    // Ejecutar periódicamente
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(() => {
        detectReconnectedDisks(mainWindow).catch(err => {
            console.error('Error en detección periódica de discos:', err);
        });
    }, intervalMs);

    return intervalId;
}

/**
 * Detiene la detección periódica de discos
 */
function stopPeriodicDiskDetection(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
        console.log('🛑 Detección periódica de discos detenida');
    }
}

module.exports = {
    detectReconnectedDisks,
    startPeriodicDiskDetection,
    stopPeriodicDiskDetection
};