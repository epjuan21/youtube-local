// src/main/ipc/metadataHandlers.js
// Handlers para extracción y gestión de metadatos de video con FFmpeg

const { ipcMain } = require('electron');
const { getDatabase } = require('../database');
const { getVideoMetadata } = require('../thumbnailGenerator');
const { extractAndSaveMetadata } = require('../scanner');
const fs = require('fs');
const path = require('path');

function setupMetadataHandlers(mainWindow) {

    /**
     * Extraer metadatos de un video específico
     */
    ipcMain.handle('metadata:extract', async (event, videoId) => {
        const db = getDatabase();

        try {
            const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);

            if (!video) {
                return { success: false, error: 'Video no encontrado' };
            }

            if (!fs.existsSync(video.filepath)) {
                return { success: false, error: 'Archivo de video no disponible' };
            }

            const result = await extractAndSaveMetadata(videoId, video.filepath);

            if (result.success) {
                // Obtener el video actualizado
                const updatedVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
                return { success: true, video: updatedVideo, metadata: result.metadata };
            } else {
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('Error extrayendo metadatos:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Extraer metadatos de múltiples videos (lote)
     * Emite eventos de progreso
     */
    ipcMain.handle('metadata:extractBatch', async (event, videoIds = null) => {
        const db = getDatabase();

        try {
            // Si no se especifican IDs, obtener todos los videos sin metadatos extraídos
            let videos;
            if (videoIds && videoIds.length > 0) {
                const placeholders = videoIds.map(() => '?').join(',');
                videos = db.prepare(`
                    SELECT id, filepath, filename FROM videos 
                    WHERE id IN (${placeholders}) AND is_available = 1
                `).all(...videoIds);
            } else {
                videos = db.prepare(`
                    SELECT id, filepath, filename FROM videos 
                    WHERE metadata_extracted = 0 AND is_available = 1
                `).all();
            }

            if (videos.length === 0) {
                return {
                    success: true,
                    message: 'No hay videos pendientes de extracción',
                    processed: 0,
                    failed: 0
                };
            }

            console.log(`\n🎬 Extrayendo metadatos de ${videos.length} videos...\n`);

            // Emitir evento de inicio
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('metadata-extraction-start', {
                    total: videos.length
                });
            }

            const results = {
                processed: 0,
                failed: 0,
                errors: []
            };

            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];

                // Emitir progreso
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('metadata-extraction-progress', {
                        current: i + 1,
                        total: videos.length,
                        filename: video.filename,
                        progress: Math.round(((i + 1) / videos.length) * 100)
                    });
                }

                // Verificar que el archivo existe
                if (!fs.existsSync(video.filepath)) {
                    results.failed++;
                    results.errors.push({ videoId: video.id, error: 'Archivo no encontrado' });
                    continue;
                }

                try {
                    const result = await extractAndSaveMetadata(video.id, video.filepath);

                    if (result.success) {
                        results.processed++;
                    } else {
                        results.failed++;
                        results.errors.push({ videoId: video.id, error: result.error });
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({ videoId: video.id, error: error.message });
                }
            }

            // Emitir evento de completado
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('metadata-extraction-complete', {
                    processed: results.processed,
                    failed: results.failed
                });
            }

            console.log(`\n✅ Extracción completada: ${results.processed} procesados, ${results.failed} fallidos\n`);

            return {
                success: true,
                processed: results.processed,
                failed: results.failed,
                errors: results.errors.slice(0, 10) // Limitar errores retornados
            };

        } catch (error) {
            console.error('Error en extracción por lotes:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener estadísticas de metadatos
     */
    ipcMain.handle('metadata:getStats', async () => {
        const db = getDatabase();

        try {
            const stats = {
                total: db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_available = 1').get().count,
                withMetadata: db.prepare('SELECT COUNT(*) as count FROM videos WHERE metadata_extracted = 1 AND is_available = 1').get().count,
                withoutMetadata: db.prepare('SELECT COUNT(*) as count FROM videos WHERE metadata_extracted = 0 AND is_available = 1').get().count,
                failed: db.prepare('SELECT COUNT(*) as count FROM videos WHERE metadata_extracted = -1 AND is_available = 1').get().count
            };

            // Resoluciones más comunes
            const resolutions = db.prepare(`
                SELECT resolution, COUNT(*) as count 
                FROM videos 
                WHERE resolution IS NOT NULL AND is_available = 1
                GROUP BY resolution 
                ORDER BY count DESC 
                LIMIT 10
            `).all();

            // Codecs más comunes
            const videoCodecs = db.prepare(`
                SELECT video_codec, COUNT(*) as count 
                FROM videos 
                WHERE video_codec IS NOT NULL AND is_available = 1
                GROUP BY video_codec 
                ORDER BY count DESC 
                LIMIT 10
            `).all();

            const audioCodecs = db.prepare(`
                SELECT audio_codec, COUNT(*) as count 
                FROM videos 
                WHERE audio_codec IS NOT NULL AND is_available = 1
                GROUP BY audio_codec 
                ORDER BY count DESC 
                LIMIT 10
            `).all();

            return {
                success: true,
                stats,
                resolutions,
                videoCodecs,
                audioCodecs
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas de metadatos:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener videos por resolución
     */
    ipcMain.handle('metadata:getByResolution', async (event, resolution) => {
        const db = getDatabase();

        try {
            let videos;

            if (resolution === 'unknown') {
                videos = db.prepare(`
                    SELECT * FROM videos 
                    WHERE resolution IS NULL AND is_available = 1
                    ORDER BY upload_date DESC
                `).all();
            } else {
                videos = db.prepare(`
                    SELECT * FROM videos 
                    WHERE resolution = ? AND is_available = 1
                    ORDER BY upload_date DESC
                `).all(resolution);
            }

            return { success: true, videos };

        } catch (error) {
            console.error('Error obteniendo videos por resolución:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Reintentar extracción de metadatos fallidos
     */
    ipcMain.handle('metadata:retryFailed', async () => {
        const db = getDatabase();

        try {
            // Resetear videos con extracción fallida
            const result = db.prepare(`
                UPDATE videos SET metadata_extracted = 0 
                WHERE metadata_extracted = -1 AND is_available = 1
            `).run();

            console.log(`🔄 ${result.changes} videos marcados para reintento de extracción`);

            return {
                success: true,
                reset: result.changes,
                message: `${result.changes} videos listos para reintentar extracción`
            };

        } catch (error) {
            console.error('Error reseteando videos fallidos:', error);
            return { success: false, error: error.message };
        }
    });

    /**
     * Obtener metadatos crudos de un archivo (sin guardar)
     * Útil para previsualización
     */
    ipcMain.handle('metadata:getRaw', async (event, filepath) => {
        try {
            if (!fs.existsSync(filepath)) {
                return { success: false, error: 'Archivo no encontrado' };
            }

            const metadata = await getVideoMetadata(filepath);

            return {
                success: true,
                metadata: {
                    duration: metadata.duration,
                    resolution: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : null,
                    width: metadata.width,
                    height: metadata.height,
                    videoCodec: metadata.videoCodec,
                    audioCodec: metadata.audioCodec,
                    bitrate: metadata.bitrate,
                    format: metadata.format
                }
            };

        } catch (error) {
            console.error('Error obteniendo metadatos crudos:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Metadata handlers registrados');
}

module.exports = { setupMetadataHandlers };