const { ipcMain, dialog } = require('electron');
const { getDatabase } = require('../database');
const path = require('path');
const fs = require('fs');

function setupVideoHandlers() {
    // Obtener todos los videos
    ipcMain.handle('get-videos', async (event, filters = {}) => {
        const db = getDatabase();
        let query = 'SELECT * FROM videos';
        const conditions = [];
        const params = [];

        // Filtrar por disponibilidad
        if (filters.onlyAvailable !== false) {
            conditions.push('is_available = 1');
        }

        // Filtrar por búsqueda
        if (filters.search) {
            conditions.push('(title LIKE ? OR description LIKE ?)');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        // Filtrar por rating mínimo
        if (filters.minRating) {
            conditions.push('rating >= ?');
            params.push(filters.minRating);
        }

        // Filtrar por rating máximo
        if (filters.maxRating) {
            conditions.push('rating <= ?');
            params.push(filters.maxRating);
        }

        // Filtrar solo con notas
        if (filters.hasNotes) {
            conditions.push("notes IS NOT NULL AND notes != ''");
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY upload_date DESC';

        const videos = db.prepare(query).all(...params);
        return videos;
    });

    // Obtener video por ID (SIN incrementar vistas)
    ipcMain.handle('get-video-by-id', async (event, id) => {
        const db = getDatabase();
        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        return video;
    });

    // Incrementar vista de un video
    ipcMain.handle('increment-video-view', async (event, id) => {
        const db = getDatabase();
        db.prepare('UPDATE videos SET views = views + 1, last_watched = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
        return video;
    });

    // Actualizar video (método original)
    ipcMain.handle('update-video', async (event, id, videoData) => {
        const db = getDatabase();
        const stmt = db.prepare(`
            UPDATE videos 
            SET title = COALESCE(?, title), 
                description = COALESCE(?, description), 
                likes = COALESCE(?, likes),
                dislikes = COALESCE(?, dislikes)
            WHERE id = ?
        `);

        stmt.run(
            videoData.title || null,
            videoData.description || null,
            videoData.likes !== undefined ? videoData.likes : null,
            videoData.dislikes !== undefined ? videoData.dislikes : null,
            id
        );

        return { id, ...videoData };
    });

    // =====================================================
    // NUEVO: Actualizar metadatos completos de un video
    // =====================================================
    ipcMain.handle('video:updateMetadata', async (event, id, metadata) => {
        const db = getDatabase();

        try {
            console.log(`📝 Actualizando metadatos del video ID: ${id}`);
            console.log('   Datos:', metadata);

            // Construir la consulta dinámicamente según los campos proporcionados
            const updates = [];
            const params = [];

            if (metadata.title !== undefined) {
                updates.push('title = ?');
                params.push(metadata.title);
            }

            if (metadata.description !== undefined) {
                updates.push('description = ?');
                params.push(metadata.description || null);
            }

            if (metadata.rating !== undefined) {
                // Validar rating entre 1-10 o null
                const rating = metadata.rating === null || metadata.rating === 0
                    ? null
                    : Math.min(10, Math.max(1, parseInt(metadata.rating)));
                updates.push('rating = ?');
                params.push(rating);
            }

            if (metadata.notes !== undefined) {
                updates.push('notes = ?');
                params.push(metadata.notes || null);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No hay campos para actualizar' };
            }

            params.push(id);

            const query = `UPDATE videos SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            if (result.changes > 0) {
                const updatedVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
                console.log('✅ Metadatos actualizados correctamente');
                return { success: true, video: updatedVideo };
            } else {
                return { success: false, error: 'Video no encontrado' };
            }

        } catch (error) {
            console.error('❌ Error actualizando metadatos:', error);
            return { success: false, error: error.message };
        }
    });

    // =====================================================
    // NUEVO: Edición en lote - Actualizar múltiples videos
    // =====================================================
    ipcMain.handle('video:bulkUpdateMetadata', async (event, videoIds, metadata) => {
        const db = getDatabase();

        try {
            console.log(`📝 Actualizando metadatos en lote para ${videoIds.length} videos`);
            console.log('   Datos:', metadata);

            if (!videoIds || videoIds.length === 0) {
                return { success: false, error: 'No se proporcionaron videos' };
            }

            const results = {
                success: true,
                updated: 0,
                failed: 0,
                errors: []
            };

            // Usar transacción para mejor rendimiento
            const updateTransaction = db.transaction(() => {
                for (const videoId of videoIds) {
                    try {
                        const updates = [];
                        const params = [];

                        // Solo actualizar campos que se proporcionaron
                        if (metadata.title !== undefined && metadata.title !== '') {
                            updates.push('title = ?');
                            params.push(metadata.title);
                        }

                        if (metadata.titlePrefix !== undefined && metadata.titlePrefix !== '') {
                            // Agregar prefijo al título existente
                            updates.push('title = ? || title');
                            params.push(metadata.titlePrefix);
                        }

                        if (metadata.titleSuffix !== undefined && metadata.titleSuffix !== '') {
                            // Agregar sufijo al título existente
                            updates.push('title = title || ?');
                            params.push(metadata.titleSuffix);
                        }

                        if (metadata.description !== undefined) {
                            updates.push('description = ?');
                            params.push(metadata.description || null);
                        }

                        if (metadata.rating !== undefined) {
                            const rating = metadata.rating === null || metadata.rating === 0
                                ? null
                                : Math.min(10, Math.max(1, parseInt(metadata.rating)));
                            updates.push('rating = ?');
                            params.push(rating);
                        }

                        if (metadata.notes !== undefined) {
                            updates.push('notes = ?');
                            params.push(metadata.notes || null);
                        }

                        if (updates.length > 0) {
                            params.push(videoId);
                            const query = `UPDATE videos SET ${updates.join(', ')} WHERE id = ?`;
                            const result = db.prepare(query).run(...params);

                            if (result.changes > 0) {
                                results.updated++;
                            } else {
                                results.failed++;
                                results.errors.push({ videoId, error: 'Video no encontrado' });
                            }
                        }
                    } catch (error) {
                        results.failed++;
                        results.errors.push({ videoId, error: error.message });
                    }
                }
            });

            updateTransaction();

            console.log(`✅ Edición en lote completada: ${results.updated} actualizados, ${results.failed} fallidos`);
            return results;

        } catch (error) {
            console.error('❌ Error en edición en lote:', error);
            return { success: false, error: error.message };
        }
    });

    // =====================================================
    // NUEVO: Edición en lote - Cambiar categorías
    // =====================================================
    ipcMain.handle('video:bulkSetCategories', async (event, videoIds, categoryIds, mode = 'replace') => {
        const db = getDatabase();

        try {
            console.log(`🏷️ Actualizando categorías en lote para ${videoIds.length} videos`);
            console.log(`   Modo: ${mode}, Categorías: ${categoryIds}`);

            const results = {
                success: true,
                updated: 0,
                failed: 0
            };

            const updateTransaction = db.transaction(() => {
                for (const videoId of videoIds) {
                    try {
                        if (mode === 'replace') {
                            // Eliminar categorías existentes
                            db.prepare('DELETE FROM video_categories WHERE video_id = ?').run(videoId);
                        }

                        // Agregar nuevas categorías
                        const insertStmt = db.prepare(`
                            INSERT OR IGNORE INTO video_categories (video_id, category_id)
                            VALUES (?, ?)
                        `);

                        for (const categoryId of categoryIds) {
                            insertStmt.run(videoId, categoryId);
                        }

                        results.updated++;
                    } catch (error) {
                        results.failed++;
                    }
                }
            });

            updateTransaction();

            console.log(`✅ Categorías actualizadas: ${results.updated} videos`);
            return results;

        } catch (error) {
            console.error('❌ Error actualizando categorías en lote:', error);
            return { success: false, error: error.message };
        }
    });

    // =====================================================
    // NUEVO: Edición en lote - Cambiar tags
    // =====================================================
    ipcMain.handle('video:bulkSetTags', async (event, videoIds, tagIds, mode = 'replace') => {
        const db = getDatabase();

        try {
            console.log(`#️⃣ Actualizando tags en lote para ${videoIds.length} videos`);
            console.log(`   Modo: ${mode}, Tags: ${tagIds}`);

            const results = {
                success: true,
                updated: 0,
                failed: 0
            };

            const updateTransaction = db.transaction(() => {
                for (const videoId of videoIds) {
                    try {
                        if (mode === 'replace') {
                            // Eliminar tags existentes
                            db.prepare('DELETE FROM video_tags WHERE video_id = ?').run(videoId);
                        }

                        // Agregar nuevos tags
                        const insertStmt = db.prepare(`
                            INSERT OR IGNORE INTO video_tags (video_id, tag_id)
                            VALUES (?, ?)
                        `);

                        for (const tagId of tagIds) {
                            insertStmt.run(videoId, tagId);
                        }

                        // Actualizar contador de uso de tags
                        for (const tagId of tagIds) {
                            db.prepare(`
                                UPDATE tags SET usage_count = (
                                    SELECT COUNT(*) FROM video_tags WHERE tag_id = ?
                                ) WHERE id = ?
                            `).run(tagId, tagId);
                        }

                        results.updated++;
                    } catch (error) {
                        results.failed++;
                    }
                }
            });

            updateTransaction();

            console.log(`✅ Tags actualizados: ${results.updated} videos`);
            return results;

        } catch (error) {
            console.error('❌ Error actualizando tags en lote:', error);
            return { success: false, error: error.message };
        }
    });

    // =====================================================
    // NUEVO: Obtener múltiples videos por IDs
    // =====================================================
    ipcMain.handle('video:getByIds', async (event, videoIds) => {
        const db = getDatabase();

        try {
            if (!videoIds || videoIds.length === 0) {
                return { success: true, videos: [] };
            }

            const placeholders = videoIds.map(() => '?').join(',');
            const videos = db.prepare(`
                SELECT * FROM videos WHERE id IN (${placeholders})
            `).all(...videoIds);

            return { success: true, videos };

        } catch (error) {
            console.error('❌ Error obteniendo videos:', error);
            return { success: false, error: error.message };
        }
    });

    // Incrementar tiempo de visualización
    ipcMain.handle('update-watch-time', async (event, id, seconds) => {
        const db = getDatabase();
        db.prepare('UPDATE videos SET watch_time = watch_time + ? WHERE id = ?').run(seconds, id);
        return { success: true };
    });

    // Obtener estadísticas
    ipcMain.handle('get-video-stats', async () => {
        const db = getDatabase();
        const stats = {
            total: db.prepare('SELECT COUNT(*) as count FROM videos').get().count,
            available: db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_available = 1').get().count,
            unavailable: db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_available = 0').get().count,
            totalViews: db.prepare('SELECT SUM(views) as total FROM videos').get().total || 0,
            totalWatchTime: db.prepare('SELECT SUM(watch_time) as total FROM videos').get().total || 0,
            // Nuevas estadísticas
            withRating: db.prepare('SELECT COUNT(*) as count FROM videos WHERE rating IS NOT NULL').get().count,
            withNotes: db.prepare("SELECT COUNT(*) as count FROM videos WHERE notes IS NOT NULL AND notes != ''").get().count,
            avgRating: db.prepare('SELECT AVG(rating) as avg FROM videos WHERE rating IS NOT NULL').get().avg || 0
        };
        return stats;
    });
}

module.exports = { setupVideoHandlers };