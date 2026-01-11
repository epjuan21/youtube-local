const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./database');
const { generateThumbnail, getVideoDuration, getVideoMetadata } = require('./thumbnailGenerator');
const { getDiskIdentifier, getMountPoint, getRelativePath, reconstructFullPath } = require('./diskUtils');
const { generateVideoHash, generateLegacyHash } = require('./videoHash');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'];

/**
 * Escanea un directorio recursivamente buscando videos
 * @param {string} directoryPath - Ruta del directorio a escanear
 * @param {string} diskIdentifier - UUID del disco
 * @param {string} mountPoint - Punto de montaje del disco
 * @param {Function} onProgress - Callback para reportar progreso
 * @returns {Promise<Array>} - Array de objetos con información de videos
 */
async function scanDirectory(directoryPath, diskIdentifier, mountPoint, onProgress = null) {
    const videos = [];

    async function walkDir(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await walkDir(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(ext)) {
                        try {
                            const stats = fs.statSync(fullPath);

                            // Calcular ruta relativa desde el mount point
                            const relativePath = getRelativePath(fullPath, mountPoint);

                            // Generar hash usando el nuevo método
                            const fileHash = generateVideoHash(diskIdentifier, relativePath, stats.size);

                            const videoData = {
                                filename: entry.name,
                                filepath: fullPath,              // Ruta completa actual
                                relativePath: relativePath,       // Ruta relativa al mount point
                                fileSize: stats.size,
                                fileModifiedDate: stats.mtime,
                                fileHash: fileHash,
                                diskIdentifier: diskIdentifier
                            };

                            videos.push(videoData);

                            if (onProgress) {
                                onProgress({
                                    type: 'found',
                                    filename: entry.name,
                                    total: videos.length
                                });
                            }
                        } catch (err) {
                            console.error(`Error procesando archivo ${fullPath}:`, err);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Error escaneando directorio ${dir}:`, err);
        }
    }

    await walkDir(directoryPath);
    return videos;
}

/**
 * Convierte una fecha a formato compatible con SQLite
 * @param {Date|string|number} date - Fecha a convertir
 * @returns {string} - Fecha en formato ISO string o timestamp actual
 */
function toSQLiteDate(date) {
    if (!date) {
        return new Date().toISOString();
    }
    
    if (date instanceof Date) {
        return date.toISOString();
    }
    
    if (typeof date === 'string') {
        return date;
    }
    
    if (typeof date === 'number') {
        return new Date(date).toISOString();
    }
    
    return new Date().toISOString();
}

/**
 * Extrae metadatos de un video usando FFmpeg y los guarda en la BD
 * @param {number} videoId - ID del video en la BD
 * @param {string} videoPath - Ruta del video
 * @returns {Promise<Object>} - Metadatos extraídos
 */
async function extractAndSaveMetadata(videoId, videoPath) {
    const db = getDatabase();
    
    try {
        console.log(`🎬 Extrayendo metadatos de: ${path.basename(videoPath)}`);
        
        const metadata = await getVideoMetadata(videoPath);
        
        // Calcular resolución como string (ej: "1920x1080")
        const resolution = metadata.width && metadata.height 
            ? `${metadata.width}x${metadata.height}` 
            : null;
        
        // Actualizar en la base de datos
        db.prepare(`
            UPDATE videos 
            SET duration = ?,
                resolution = ?,
                width = ?,
                height = ?,
                video_codec = ?,
                audio_codec = ?,
                metadata_extracted = 1
            WHERE id = ?
        `).run(
            metadata.duration || null,
            resolution,
            metadata.width || null,
            metadata.height || null,
            metadata.videoCodec || null,
            metadata.audioCodec || null,
            videoId
        );
        
        console.log(`   ✓ Metadatos guardados: ${resolution || 'N/A'}, ${metadata.videoCodec || 'N/A'}`);
        
        return {
            success: true,
            metadata: {
                duration: metadata.duration,
                resolution,
                width: metadata.width,
                height: metadata.height,
                videoCodec: metadata.videoCodec,
                audioCodec: metadata.audioCodec
            }
        };
        
    } catch (error) {
        console.error(`   ✗ Error extrayendo metadatos:`, error.message);
        
        // Marcar como procesado aunque haya fallado para no reintentar indefinidamente
        db.prepare(`
            UPDATE videos SET metadata_extracted = -1 WHERE id = ?
        `).run(videoId);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Sincroniza videos encontrados con la base de datos
 * 
 * 🛠 BUG FIX (2026-01-07):
 * Se removió el filtro por disk_identifier en la consulta principal
 * para evitar conflictos cuando múltiples carpetas están en el mismo disco.
 * 
 * 🆕 FEATURE (2026-01-11):
 * Ahora extrae metadatos FFmpeg (duración, resolución, codec) automáticamente
 * para videos nuevos.
 */
async function syncVideosWithDatabase(videos, watchFolderId, diskIdentifier, onProgress = null) {
    const db = getDatabase();
    const stats = {
        added: 0,
        updated: 0,
        removed: 0,
        unchanged: 0,
        thumbnailsGenerated: 0,
        metadataExtracted: 0
    };

    // ✅ FIX: Obtener solo videos de ESTA carpeta específica
    const existingVideos = db.prepare(`
        SELECT * FROM videos 
        WHERE watch_folder_id = ?
    `).all(watchFolderId);

    const existingHashes = new Set(existingVideos.map(v => v.file_hash));
    const foundHashes = new Set(videos.map(v => v.fileHash));

    // Procesar videos encontrados
    for (const videoData of videos) {
        const existing = existingVideos.find(v => v.file_hash === videoData.fileHash);

        if (existing) {
            // Video ya existe - verificar si cambió la ruta completa o estaba no disponible
            if (existing.filepath !== videoData.filepath || !existing.is_available) {
                // Actualizar ruta completa y marcar como disponible
                db.prepare(`
                    UPDATE videos 
                    SET filepath = ?, 
                        is_available = 1, 
                        file_modified_date = ?
                    WHERE id = ?
                `).run(
                    videoData.filepath, 
                    toSQLiteDate(videoData.fileModifiedDate), 
                    existing.id
                );

                stats.updated++;

                if (onProgress) {
                    onProgress({ type: 'updated', filename: videoData.filename });
                }
            } else {
                // Sin cambios
                stats.unchanged++;
            }
        } else {
            // Video nuevo - agregarlo
            try {
                // Generar título desde filename
                const title = videoData.filename.replace(/\.[^/.]+$/, "");

                // ✅ FIX: Convertir fecha a formato SQLite
                const sqliteDate = toSQLiteDate(videoData.fileModifiedDate);

                // Insertar en base de datos
                const result = db.prepare(`
                    INSERT INTO videos (
                        title, filename, filepath, relative_filepath, file_hash, 
                        file_size, file_modified_date, watch_folder_id, 
                        disk_identifier, is_available, metadata_extracted
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
                `).run(
                    title,
                    videoData.filename,
                    videoData.filepath,
                    videoData.relativePath,
                    videoData.fileHash,
                    videoData.fileSize,
                    sqliteDate,
                    watchFolderId,
                    diskIdentifier
                );

                const videoId = result.lastInsertRowid;
                stats.added++;

                if (onProgress) {
                    onProgress({ type: 'added', filename: videoData.filename });
                }

                // Generar thumbnail y extraer metadatos en background (no esperar)
                // Usamos Promise.all para ejecutar ambos en paralelo
                Promise.all([
                    // Generar thumbnail
                    generateThumbnail(videoData.filepath, videoId)
                        .then((thumbnailPath) => {
                            // Actualizar ruta del thumbnail en BD
                            db.prepare('UPDATE videos SET thumbnail = ? WHERE id = ?')
                                .run(thumbnailPath, videoId);
                            stats.thumbnailsGenerated++;
                        })
                        .catch(err => {
                            console.error(`Error generando thumbnail para ${videoData.filename}:`, err.message);
                        }),
                    
                    // 🆕 Extraer metadatos con FFmpeg
                    extractAndSaveMetadata(videoId, videoData.filepath)
                        .then((result) => {
                            if (result.success) {
                                stats.metadataExtracted++;
                            }
                        })
                        .catch(err => {
                            console.error(`Error extrayendo metadatos para ${videoData.filename}:`, err.message);
                        })
                ]);

            } catch (err) {
                console.error(`Error insertando video ${videoData.filename}:`, err);
            }
        }
    }

    // Marcar como no disponibles los videos que ya no existen en el sistema de archivos
    for (const existing of existingVideos) {
        if (!foundHashes.has(existing.file_hash) && existing.is_available) {
            db.prepare(`
                UPDATE videos 
                SET is_available = 0 
                WHERE id = ?
            `).run(existing.id);

            stats.removed++;

            if (onProgress) {
                onProgress({ type: 'unavailable', filename: existing.filename });
            }
        }
    }

    // Guardar historial de sincronización
    db.prepare(`
        INSERT INTO sync_history (watch_folder_id, videos_added, videos_removed, videos_updated)
        VALUES (?, ?, ?, ?)
    `).run(watchFolderId, stats.added, stats.removed, stats.updated);

    return stats;
}

/**
 * Escanea una carpeta específica (punto de entrada principal)
 */
async function scanWatchFolder(watchFolderId, onProgress = null) {
    const db = getDatabase();
    const folder = db.prepare('SELECT * FROM watch_folders WHERE id = ?').get(watchFolderId);

    if (!folder) {
        throw new Error('Carpeta no encontrada');
    }

    if (!fs.existsSync(folder.folder_path)) {
        throw new Error('La ruta no existe o no está accesible');
    }

    console.log(`\n🔍 Escaneando carpeta: ${folder.folder_path}`);

    // Obtener o actualizar disk identifier
    let diskIdentifier = folder.disk_identifier;
    let mountPoint = folder.disk_mount_point;

    if (!diskIdentifier) {
        console.log('   Detectando disco...');
        diskIdentifier = await getDiskIdentifier(folder.folder_path);
        mountPoint = await getMountPoint(folder.folder_path);
        const relativePath = getRelativePath(folder.folder_path, mountPoint);

        console.log(`   Disk ID: ${diskIdentifier}`);
        console.log(`   Mount Point: ${mountPoint}`);
        console.log(`   Relative Path: ${relativePath}`);

        // Actualizar en base de datos
        db.prepare(`
            UPDATE watch_folders 
            SET disk_identifier = ?, 
                disk_mount_point = ?,
                relative_path = ?
            WHERE id = ?
        `).run(diskIdentifier, mountPoint, relativePath, watchFolderId);
    } else {
        // Verificar si el disco cambió
        const currentDiskId = await getDiskIdentifier(folder.folder_path);

        if (currentDiskId !== diskIdentifier) {
            console.warn(`\n⚠️  ADVERTENCIA: Disco diferente detectado`);
            console.warn(`    Esperado: ${diskIdentifier}`);
            console.warn(`    Actual: ${currentDiskId}`);
            console.warn(`    Esta carpeta parece ser de un disco diferente.`);

            throw new Error(
                'Disco diferente detectado. ' +
                'Si desea indexar esta carpeta, elimine la carpeta anterior primero.'
            );
        }

        // Actualizar mount point si cambió
        const currentMountPoint = await getMountPoint(folder.folder_path);
        if (currentMountPoint !== mountPoint) {
            console.log(`   🔄 Mount point actualizado: ${currentMountPoint}`);
            db.prepare(`
                UPDATE watch_folders 
                SET disk_mount_point = ?
                WHERE id = ?
            `).run(currentMountPoint, watchFolderId);
            mountPoint = currentMountPoint;
        }
    }

    // Escanear directorio
    const videos = await scanDirectory(
        folder.folder_path,
        diskIdentifier,
        mountPoint,
        onProgress
    );

    console.log(`   Videos encontrados: ${videos.length}`);

    // Sincronizar con base de datos
    const stats = await syncVideosWithDatabase(
        videos,
        watchFolderId,
        diskIdentifier,
        onProgress
    );

    // Actualizar fecha de último escaneo
    db.prepare('UPDATE watch_folders SET last_scan = CURRENT_TIMESTAMP WHERE id = ?')
        .run(watchFolderId);

    console.log(`   ✅ Sincronización completada`);
    console.log(`      Agregados: ${stats.added}`);
    console.log(`      Actualizados: ${stats.updated}`);
    console.log(`      No disponibles: ${stats.removed}`);
    console.log(`      Sin cambios: ${stats.unchanged}`);
    console.log(`      Metadatos extraídos: ${stats.metadataExtracted}\n`);

    return { ...stats, totalFound: videos.length };
}

module.exports = {
    scanDirectory,
    syncVideosWithDatabase,
    scanWatchFolder,
    extractAndSaveMetadata
};