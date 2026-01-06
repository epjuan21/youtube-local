const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const crypto = require('crypto');

// Configurar ruta de ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Directorio para almacenar thumbnails
const THUMBNAILS_DIR = path.join(app.getPath('userData'), 'thumbnails');

// Crear directorio si no existe
if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    console.log('📁 Directorio de thumbnails creado:', THUMBNAILS_DIR);
}

/**
 * Genera un thumbnail para un video
 * @param {string} videoPath - Ruta completa del video
 * @param {string} videoHash - Hash único del video
 * @returns {Promise<string>} - Ruta del thumbnail generado
 */
function generateThumbnail(videoPath, videoHash) {
    return new Promise((resolve, reject) => {
        // Nombre del thumbnail basado en el hash
        const thumbnailFilename = `${videoHash}.jpg`;
        const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

        // Si ya existe, retornar la ruta
        if (fs.existsSync(thumbnailPath)) {
            console.log('✓ Thumbnail ya existe:', thumbnailFilename);
            resolve(thumbnailPath);
            return;
        }

        // Verificar que el video existe
        if (!fs.existsSync(videoPath)) {
            reject(new Error('Video no encontrado: ' + videoPath));
            return;
        }

        console.log('🎬 Generando thumbnail para:', path.basename(videoPath));

        // Generar thumbnail en el segundo 5 del video
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['5'],  // Capturar en el segundo 5
                filename: thumbnailFilename,
                folder: THUMBNAILS_DIR,
                size: '640x360'  // Resolución del thumbnail
            })
            .on('end', () => {
                console.log('✓ Thumbnail generado:', thumbnailFilename);
                resolve(thumbnailPath);
            })
            .on('error', (err) => {
                console.error('✗ Error generando thumbnail:', err.message);
                // Si falla, intentar con el primer frame
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: ['00:00:01'],
                        filename: thumbnailFilename,
                        folder: THUMBNAILS_DIR,
                        size: '640x360'
                    })
                    .on('end', () => {
                        console.log('✓ Thumbnail generado (primer frame):', thumbnailFilename);
                        resolve(thumbnailPath);
                    })
                    .on('error', (retryErr) => {
                        console.error('✗ Error en segundo intento:', retryErr.message);
                        reject(retryErr);
                    });
            });
    });
}

/**
 * Obtiene la duración de un video
 * @param {string} videoPath - Ruta del video
 * @returns {Promise<number>} - Duración en segundos
 */
function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            const duration = metadata.format.duration;
            resolve(Math.floor(duration));
        });
    });
}

/**
 * Obtiene metadatos completos del video
 * @param {string} videoPath - Ruta del video
 * @returns {Promise<Object>} - Metadatos del video
 */
function getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            resolve({
                duration: Math.floor(metadata.format.duration || 0),
                size: metadata.format.size,
                bitrate: metadata.format.bit_rate,
                format: metadata.format.format_name,
                videoCodec: videoStream?.codec_name,
                width: videoStream?.width,
                height: videoStream?.height,
                fps: videoStream?.r_frame_rate,
                audioCodec: audioStream?.codec_name,
                audioChannels: audioStream?.channels
            });
        });
    });
}

/**
 * Genera thumbnails para múltiples videos
 * @param {Array} videos - Array de objetos con videoPath y videoHash
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<Array>} - Array de rutas de thumbnails
 */
async function generateThumbnailsBatch(videos, onProgress = null) {
    const results = [];

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];

        try {
            const thumbnailPath = await generateThumbnail(video.videoPath, video.videoHash);
            results.push({ success: true, thumbnailPath, videoHash: video.videoHash });

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: videos.length,
                    videoPath: video.videoPath,
                    success: true
                });
            }
        } catch (error) {
            console.error(`Error generando thumbnail para ${video.videoPath}:`, error);
            results.push({ success: false, error: error.message, videoHash: video.videoHash });

            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: videos.length,
                    videoPath: video.videoPath,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    return results;
}

/**
 * Obtiene la ruta del directorio de thumbnails
 */
function getThumbnailsDirectory() {
    return THUMBNAILS_DIR;
}

/**
 * Limpia thumbnails huérfanos (videos eliminados)
 * @param {Array} activeHashes - Array de hashes de videos activos
 */
function cleanupOrphanedThumbnails(activeHashes) {
    const files = fs.readdirSync(THUMBNAILS_DIR);
    let removed = 0;

    files.forEach(file => {
        const hash = path.basename(file, '.jpg');
        if (!activeHashes.includes(hash)) {
            fs.unlinkSync(path.join(THUMBNAILS_DIR, file));
            removed++;
        }
    });

    console.log(`🗑️  Thumbnails huérfanos eliminados: ${removed}`);
    return removed;
}

module.exports = {
    generateThumbnail,
    getVideoDuration,
    getVideoMetadata,
    generateThumbnailsBatch,
    getThumbnailsDirectory,
    cleanupOrphanedThumbnails
};