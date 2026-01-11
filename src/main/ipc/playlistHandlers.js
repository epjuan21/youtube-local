// ============================================
// PLAYLIST HANDLERS - IPC Backend
// ============================================
// Ubicación: src/main/ipc/playlistHandlers.js
// Fecha: 09 de Enero de 2025
// ============================================

const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

/**
 * Inicializa todos los handlers de playlists
 */
function initPlaylistHandlers() {

    // ============================================
    // 1. GET ALL PLAYLISTS
    // ============================================
    ipcMain.handle('playlist:getAll', async () => {
        try {
            const db = getDatabase();
            const playlists = db.prepare(`
                SELECT 
                    p.*,
                    COUNT(pv.video_id) as video_count,
                    COALESCE(SUM(v.duration), 0) as total_duration,
                    (
                        SELECT v2.thumbnail 
                        FROM playlist_videos pv2 
                        JOIN videos v2 ON pv2.video_id = v2.id 
                        WHERE pv2.playlist_id = p.id 
                        ORDER BY pv2.position ASC 
                        LIMIT 1
                    ) as first_thumbnail
                FROM playlists p
                LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
                LEFT JOIN videos v ON pv.video_id = v.id
                GROUP BY p.id
                ORDER BY p.updated_at DESC
            `).all();

            return { success: true, playlists };
        } catch (error) {
            console.error('Error getting playlists:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 2. GET PLAYLIST BY ID
    // ============================================
    ipcMain.handle('playlist:getById', async (event, playlistId) => {
        try {
            const db = getDatabase();
            const playlist = db.prepare(`
                SELECT * FROM playlists WHERE id = ?
            `).get(playlistId);

            if (!playlist) {
                return { success: false, error: 'Playlist not found' };
            }

            // Obtener estadísticas
            const stats = db.prepare(`
                SELECT 
                    COUNT(pv.video_id) as video_count,
                    COALESCE(SUM(v.duration), 0) as total_duration
                FROM playlist_videos pv
                LEFT JOIN videos v ON pv.video_id = v.id
                WHERE pv.playlist_id = ?
            `).get(playlistId);

            playlist.video_count = stats.video_count;
            playlist.total_duration = stats.total_duration;

            return { success: true, playlist };
        } catch (error) {
            console.error('Error getting playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 3. CREATE PLAYLIST
    // ============================================
    ipcMain.handle('playlist:create', async (event, playlistData) => {
        try {
            const db = getDatabase();
            const { name, description = '', color = '#10b981' } = playlistData;

            if (!name || name.trim() === '') {
                return { success: false, error: 'El nombre de la playlist es requerido' };
            }

            const result = db.prepare(`
                INSERT INTO playlists (name, description, color, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(name.trim(), description.trim(), color);

            const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);

            console.log('✅ Playlist created:', newPlaylist.name);
            return { success: true, playlist: newPlaylist };
        } catch (error) {
            console.error('Error creating playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 4. UPDATE PLAYLIST
    // ============================================
    ipcMain.handle('playlist:update', async (event, playlistId, updates) => {
        try {
            const db = getDatabase();
            const { name, description, color } = updates;

            // Verificar que existe
            const existing = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
            if (!existing) {
                return { success: false, error: 'Playlist not found' };
            }

            // Construir query de actualización
            const updateFields = [];
            const values = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                values.push(name.trim());
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                values.push(description.trim());
            }
            if (color !== undefined) {
                updateFields.push('color = ?');
                values.push(color);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(playlistId);

            db.prepare(`
                UPDATE playlists 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `).run(...values);

            const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);

            console.log('✅ Playlist updated:', updated.name);
            return { success: true, playlist: updated };
        } catch (error) {
            console.error('Error updating playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 5. DELETE PLAYLIST
    // ============================================
    ipcMain.handle('playlist:delete', async (event, playlistId) => {
        try {
            const db = getDatabase();

            // Verificar que existe
            const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
            if (!playlist) {
                return { success: false, error: 'Playlist not found' };
            }

            // Contar videos afectados
            const { count } = db.prepare(
                'SELECT COUNT(*) as count FROM playlist_videos WHERE playlist_id = ?'
            ).get(playlistId);

            // Eliminar (CASCADE eliminará playlist_videos)
            db.prepare('DELETE FROM playlists WHERE id = ?').run(playlistId);

            console.log(`✅ Playlist deleted: ${playlist.name} (${count} videos removed)`);
            return { success: true, deletedVideosCount: count };
        } catch (error) {
            console.error('Error deleting playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 6. GET PLAYLIST VIDEOS
    // ============================================
    ipcMain.handle('playlist:getVideos', async (event, playlistId) => {
        try {
            const db = getDatabase();

            const videos = db.prepare(`
                SELECT 
                    v.*,
                    pv.position,
                    pv.added_at as added_to_playlist
                FROM playlist_videos pv
                JOIN videos v ON pv.video_id = v.id
                WHERE pv.playlist_id = ?
                ORDER BY pv.position ASC
            `).all(playlistId);

            return { success: true, videos };
        } catch (error) {
            console.error('Error getting playlist videos:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 7. ADD VIDEO TO PLAYLIST
    // ============================================
    ipcMain.handle('playlist:addVideo', async (event, playlistId, videoId) => {
        try {
            const db = getDatabase();

            // Verificar si ya existe
            const existing = db.prepare(
                'SELECT * FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).get(playlistId, videoId);

            if (existing) {
                return { success: false, error: 'El video ya está en la playlist' };
            }

            // Obtener la siguiente posición
            const { maxPos } = db.prepare(
                'SELECT COALESCE(MAX(position), 0) as maxPos FROM playlist_videos WHERE playlist_id = ?'
            ).get(playlistId);

            // Insertar
            db.prepare(`
                INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `).run(playlistId, videoId, maxPos + 1);

            // Actualizar timestamp de playlist
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ Video ${videoId} added to playlist ${playlistId} at position ${maxPos + 1}`);
            return { success: true, position: maxPos + 1 };
        } catch (error) {
            console.error('Error adding video to playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 8. ADD MULTIPLE VIDEOS TO PLAYLIST
    // ============================================
    ipcMain.handle('playlist:addVideos', async (event, playlistId, videoIds) => {
        try {
            const db = getDatabase();

            // Obtener videos existentes en la playlist
            const existingVideos = db.prepare(
                'SELECT video_id FROM playlist_videos WHERE playlist_id = ?'
            ).all(playlistId).map(v => v.video_id);

            // Filtrar videos que no están ya en la playlist
            const newVideoIds = videoIds.filter(id => !existingVideos.includes(id));

            if (newVideoIds.length === 0) {
                return { success: true, addedCount: 0, message: 'Todos los videos ya están en la playlist' };
            }

            // Obtener la siguiente posición
            const { maxPos } = db.prepare(
                'SELECT COALESCE(MAX(position), 0) as maxPos FROM playlist_videos WHERE playlist_id = ?'
            ).get(playlistId);

            // Insertar todos los videos nuevos
            const insertStmt = db.prepare(`
                INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);

            let position = maxPos + 1;
            for (const videoId of newVideoIds) {
                insertStmt.run(playlistId, videoId, position);
                position++;
            }

            // Actualizar timestamp de playlist
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ ${newVideoIds.length} videos added to playlist ${playlistId}`);
            return { success: true, addedCount: newVideoIds.length };
        } catch (error) {
            console.error('Error adding videos to playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 9. REMOVE VIDEO FROM PLAYLIST
    // ============================================
    ipcMain.handle('playlist:removeVideo', async (event, playlistId, videoId) => {
        try {
            const db = getDatabase();

            // Obtener posición del video a eliminar
            const videoToRemove = db.prepare(
                'SELECT position FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).get(playlistId, videoId);

            if (!videoToRemove) {
                return { success: false, error: 'Video not found in playlist' };
            }

            // Eliminar el video
            db.prepare(
                'DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).run(playlistId, videoId);

            // Reordenar posiciones de videos posteriores
            db.prepare(`
                UPDATE playlist_videos 
                SET position = position - 1 
                WHERE playlist_id = ? AND position > ?
            `).run(playlistId, videoToRemove.position);

            // Actualizar timestamp de playlist
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ Video ${videoId} removed from playlist ${playlistId}`);
            return { success: true };
        } catch (error) {
            console.error('Error removing video from playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 10. REORDER VIDEO IN PLAYLIST
    // ============================================
    ipcMain.handle('playlist:reorderVideo', async (event, playlistId, videoId, newPosition) => {
        try {
            const db = getDatabase();

            // Obtener posición actual
            const current = db.prepare(
                'SELECT position FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).get(playlistId, videoId);

            if (!current) {
                return { success: false, error: 'Video not found in playlist' };
            }

            const oldPosition = current.position;

            if (oldPosition === newPosition) {
                return { success: true, message: 'Position unchanged' };
            }

            // Mover videos intermedios
            if (newPosition < oldPosition) {
                // Mover hacia arriba: incrementar posiciones intermedias
                db.prepare(`
                    UPDATE playlist_videos 
                    SET position = position + 1 
                    WHERE playlist_id = ? AND position >= ? AND position < ?
                `).run(playlistId, newPosition, oldPosition);
            } else {
                // Mover hacia abajo: decrementar posiciones intermedias
                db.prepare(`
                    UPDATE playlist_videos 
                    SET position = position - 1 
                    WHERE playlist_id = ? AND position > ? AND position <= ?
                `).run(playlistId, oldPosition, newPosition);
            }

            // Actualizar posición del video
            db.prepare(`
                UPDATE playlist_videos 
                SET position = ? 
                WHERE playlist_id = ? AND video_id = ?
            `).run(newPosition, playlistId, videoId);

            // Actualizar timestamp
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ Video ${videoId} moved from position ${oldPosition} to ${newPosition}`);
            return { success: true };
        } catch (error) {
            console.error('Error reordering video:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 11. REORDER PLAYLIST (bulk update)
    // ============================================
    ipcMain.handle('playlist:reorder', async (event, playlistId, videoIdsInOrder) => {
        try {
            const db = getDatabase();

            // Actualizar todas las posiciones de una vez
            const updateStmt = db.prepare(`
                UPDATE playlist_videos 
                SET position = ? 
                WHERE playlist_id = ? AND video_id = ?
            `);

            videoIdsInOrder.forEach((videoId, index) => {
                updateStmt.run(index + 1, playlistId, videoId);
            });

            // Actualizar timestamp
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ Playlist ${playlistId} reordered with ${videoIdsInOrder.length} videos`);
            return { success: true };
        } catch (error) {
            console.error('Error reordering playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 12. GET VIDEO PLAYLISTS (playlists that contain a video)
    // ============================================
    ipcMain.handle('playlist:getVideoPlaylists', async (event, videoId) => {
        try {
            const db = getDatabase();

            const playlists = db.prepare(`
                SELECT p.*, pv.position
                FROM playlists p
                JOIN playlist_videos pv ON p.id = pv.playlist_id
                WHERE pv.video_id = ?
                ORDER BY p.name ASC
            `).all(videoId);

            return { success: true, playlists };
        } catch (error) {
            console.error('Error getting video playlists:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 13. DUPLICATE PLAYLIST
    // ============================================
    ipcMain.handle('playlist:duplicate', async (event, playlistId) => {
        try {
            const db = getDatabase();

            // Obtener playlist original
            const original = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
            if (!original) {
                return { success: false, error: 'Playlist not found' };
            }

            // Crear nueva playlist
            const result = db.prepare(`
                INSERT INTO playlists (name, description, color, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(`${original.name} (copia)`, original.description || '', original.color);

            const newPlaylistId = result.lastInsertRowid;

            // Copiar videos
            db.prepare(`
                INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
                SELECT ?, video_id, position, CURRENT_TIMESTAMP
                FROM playlist_videos
                WHERE playlist_id = ?
            `).run(newPlaylistId, playlistId);

            const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(newPlaylistId);

            console.log(`✅ Playlist duplicated: ${original.name} -> ${newPlaylist.name}`);
            return { success: true, playlist: newPlaylist };
        } catch (error) {
            console.error('Error duplicating playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 14. CLEAR PLAYLIST (remove all videos)
    // ============================================
    ipcMain.handle('playlist:clear', async (event, playlistId) => {
        try {
            const db = getDatabase();

            const { count } = db.prepare(
                'SELECT COUNT(*) as count FROM playlist_videos WHERE playlist_id = ?'
            ).get(playlistId);

            db.prepare('DELETE FROM playlist_videos WHERE playlist_id = ?').run(playlistId);

            // Actualizar timestamp
            db.prepare('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(playlistId);

            console.log(`✅ Playlist ${playlistId} cleared (${count} videos removed)`);
            return { success: true, removedCount: count };
        } catch (error) {
            console.error('Error clearing playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 15. GET PLAYLIST COUNT
    // ============================================
    ipcMain.handle('playlist:getCount', async () => {
        try {
            const db = getDatabase();
            const { count } = db.prepare('SELECT COUNT(*) as count FROM playlists').get();
            return { success: true, count };
        } catch (error) {
            console.error('Error getting playlist count:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 16. SEARCH PLAYLISTS
    // ============================================
    ipcMain.handle('playlist:search', async (event, query) => {
        try {
            const db = getDatabase();

            const playlists = db.prepare(`
                SELECT 
                    p.*,
                    COUNT(pv.video_id) as video_count
                FROM playlists p
                LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
                WHERE p.name LIKE ? OR p.description LIKE ?
                GROUP BY p.id
                ORDER BY p.updated_at DESC
                LIMIT 20
            `).all(`%${query}%`, `%${query}%`);

            return { success: true, playlists };
        } catch (error) {
            console.error('Error searching playlists:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 17. EXPORT PLAYLIST (get data for export)
    // ============================================
    ipcMain.handle('playlist:export', async (event, playlistId) => {
        try {
            const db = getDatabase();

            const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
            if (!playlist) {
                return { success: false, error: 'Playlist not found' };
            }

            const videos = db.prepare(`
                SELECT 
                    v.title,
                    v.filename,
                    v.filepath,
                    v.duration,
                    pv.position
                FROM playlist_videos pv
                JOIN videos v ON pv.video_id = v.id
                WHERE pv.playlist_id = ?
                ORDER BY pv.position ASC
            `).all(playlistId);

            const exportData = {
                name: playlist.name,
                description: playlist.description,
                color: playlist.color,
                created_at: playlist.created_at,
                videos: videos.map(v => ({
                    title: v.title,
                    filename: v.filename,
                    filepath: v.filepath,
                    duration: v.duration,
                    position: v.position
                }))
            };

            console.log(`✅ Playlist exported: ${playlist.name}`);
            return { success: true, data: exportData };
        } catch (error) {
            console.error('Error exporting playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 18. IMPORT PLAYLIST
    // ============================================
    ipcMain.handle('playlist:import', async (event, importData) => {
        try {
            const db = getDatabase();

            const { name, description, color, videos } = importData;

            // Crear playlist
            const result = db.prepare(`
                INSERT INTO playlists (name, description, color, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(name || 'Playlist Importada', description || '', color || '#10b981');

            const playlistId = result.lastInsertRowid;

            // Buscar videos por filepath y agregar a la playlist
            let addedCount = 0;
            let notFoundCount = 0;

            if (videos && videos.length > 0) {
                const insertStmt = db.prepare(`
                    INSERT INTO playlist_videos (playlist_id, video_id, position, added_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `);

                for (const videoData of videos) {
                    // Buscar video por filepath o filename
                    const video = db.prepare(
                        'SELECT id FROM videos WHERE filepath = ? OR filename = ?'
                    ).get(videoData.filepath, videoData.filename);

                    if (video) {
                        try {
                            insertStmt.run(playlistId, video.id, videoData.position || addedCount + 1);
                            addedCount++;
                        } catch (e) {
                            // Video ya existe en playlist, ignorar
                        }
                    } else {
                        notFoundCount++;
                    }
                }
            }

            const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);

            console.log(`✅ Playlist imported: ${newPlaylist.name} (${addedCount} videos added, ${notFoundCount} not found)`);
            return {
                success: true,
                playlist: newPlaylist,
                addedCount,
                notFoundCount
            };
        } catch (error) {
            console.error('Error importing playlist:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 19. GET NEXT VIDEO IN PLAYLIST
    // ============================================
    ipcMain.handle('playlist:getNextVideo', async (event, playlistId, currentVideoId) => {
        try {
            const db = getDatabase();

            // Obtener posición actual
            const current = db.prepare(
                'SELECT position FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).get(playlistId, currentVideoId);

            if (!current) {
                return { success: false, error: 'Video not found in playlist' };
            }

            // Obtener siguiente video
            const next = db.prepare(`
                SELECT v.*, pv.position
                FROM playlist_videos pv
                JOIN videos v ON pv.video_id = v.id
                WHERE pv.playlist_id = ? AND pv.position > ?
                ORDER BY pv.position ASC
                LIMIT 1
            `).get(playlistId, current.position);

            return { success: true, video: next || null, hasNext: !!next };
        } catch (error) {
            console.error('Error getting next video:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 20. GET PREVIOUS VIDEO IN PLAYLIST
    // ============================================
    ipcMain.handle('playlist:getPreviousVideo', async (event, playlistId, currentVideoId) => {
        try {
            const db = getDatabase();

            // Obtener posición actual
            const current = db.prepare(
                'SELECT position FROM playlist_videos WHERE playlist_id = ? AND video_id = ?'
            ).get(playlistId, currentVideoId);

            if (!current) {
                return { success: false, error: 'Video not found in playlist' };
            }

            // Obtener video anterior
            const previous = db.prepare(`
                SELECT v.*, pv.position
                FROM playlist_videos pv
                JOIN videos v ON pv.video_id = v.id
                WHERE pv.playlist_id = ? AND pv.position < ?
                ORDER BY pv.position DESC
                LIMIT 1
            `).get(playlistId, current.position);

            return { success: true, video: previous || null, hasPrevious: !!previous };
        } catch (error) {
            console.error('Error getting previous video:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Playlist handlers initialized (20 APIs)');
}

module.exports = { initPlaylistHandlers };