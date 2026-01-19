// ============================================
// TAG HANDLERS - IPC Backend
// ============================================
// Ubicación: src/main/ipc/tagHandlers.js
// Fecha: 08 de Enero de 2025
// Actualizado: 12 de Enero de 2025 - Fase 5.1 Cache
// ============================================

const { ipcMain } = require('electron');
const { getDatabase } = require('../database');
const cacheManager = require('../cache/CacheManager');

/**
 * Inicializa todos los handlers de tags
 */
function initTagHandlers() {
    // ============================================
    // 1. GET ALL TAGS (con cache)
    // ============================================
    ipcMain.handle('tag:getAll', async () => {
        try {
            // Intentar obtener del cache
            const cached = cacheManager.get('tags', 'all');
            if (cached) {
                return cached;
            }

            const db = getDatabase();
            const tags = db.prepare(`
                SELECT
                    t.*,
                    COUNT(vt.video_id) as video_count
                FROM tags t
                LEFT JOIN video_tags vt ON t.id = vt.tag_id
                GROUP BY t.id
                ORDER BY t.usage_count DESC, t.name ASC
            `).all();

            const result = { success: true, tags };

            // Guardar en cache
            cacheManager.set('tags', 'all', result);

            return result;
        } catch (error) {
            console.error('Error getting tags:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 2. GET TAG BY ID
    // ============================================
    ipcMain.handle('tag:getById', async (event, tagId) => {
        try {
            const db = getDatabase();
            const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);

            if (!tag) {
                return { success: false, error: 'Tag not found' };
            }

            // Get video count
            const { count } = db.prepare(`
                SELECT COUNT(*) as count 
                FROM video_tags 
                WHERE tag_id = ?
            `).get(tagId);

            tag.video_count = count;

            return { success: true, tag };
        } catch (error) {
            console.error('Error getting tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 3. CREATE TAG
    // ============================================
    ipcMain.handle('tag:create', async (event, tagData) => {
        try {
            const db = getDatabase();
            const { name, color = '#6b7280' } = tagData;

            if (!name || name.trim() === '') {
                return { success: false, error: 'Tag name is required' };
            }

            // Check if tag already exists (case-insensitive)
            const existing = db.prepare(
                'SELECT * FROM tags WHERE LOWER(name) = LOWER(?)'
            ).get(name.trim());

            if (existing) {
                return { success: false, error: 'Tag already exists', tag: existing };
            }

            // Insert new tag
            const result = db.prepare(`
                INSERT INTO tags (name, color, usage_count, created_at, updated_at)
                VALUES (?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(name.trim(), color);

            const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

            // Invalidar cache de tags
            cacheManager.invalidateCache('tags');

            console.log('✅ Tag created:', newTag.name);
            return { success: true, tag: newTag };
        } catch (error) {
            console.error('Error creating tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 4. UPDATE TAG
    // ============================================
    ipcMain.handle('tag:update', async (event, tagId, updates) => {
        try {
            const db = getDatabase();
            const { name, color } = updates;

            // Check if tag exists
            const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
            if (!existing) {
                return { success: false, error: 'Tag not found' };
            }

            // Check for duplicate name (case-insensitive)
            if (name) {
                const duplicate = db.prepare(
                    'SELECT * FROM tags WHERE LOWER(name) = LOWER(?) AND id != ?'
                ).get(name.trim(), tagId);

                if (duplicate) {
                    return { success: false, error: 'Tag name already exists' };
                }
            }

            // Build update query
            const updateFields = [];
            const values = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                values.push(name.trim());
            }
            if (color !== undefined) {
                updateFields.push('color = ?');
                values.push(color);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(tagId);

            db.prepare(`
                UPDATE tags 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `).run(...values);

            const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);

            // Invalidar cache de tags
            cacheManager.invalidateCache('tags');

            console.log('✅ Tag updated:', updated.name);
            return { success: true, tag: updated };
        } catch (error) {
            console.error('Error updating tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 5. DELETE TAG
    // ============================================
    ipcMain.handle('tag:delete', async (event, tagId) => {
        try {
            const db = getDatabase();

            // Check if tag exists
            const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
            if (!tag) {
                return { success: false, error: 'Tag not found' };
            }

            // Check video count
            const { count } = db.prepare(
                'SELECT COUNT(*) as count FROM video_tags WHERE tag_id = ?'
            ).get(tagId);

            // Delete tag (CASCADE will delete video_tags entries)
            db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);

            // Invalidar cache de tags
            cacheManager.invalidateCache('tags');

            console.log(`✅ Tag deleted: ${tag.name} (${count} videos affected)`);
            return { success: true, deletedCount: count };
        } catch (error) {
            console.error('Error deleting tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 6. ASSIGN TAG TO VIDEO
    // ============================================
    ipcMain.handle('tag:assignToVideo', async (event, videoId, tagId) => {
        try {
            const db = getDatabase();

            // Check if already assigned
            const existing = db.prepare(
                'SELECT * FROM video_tags WHERE video_id = ? AND tag_id = ?'
            ).get(videoId, tagId);

            if (existing) {
                return { success: true, message: 'Tag already assigned' };
            }

            // Assign tag
            db.prepare(`
                INSERT INTO video_tags (video_id, tag_id, added_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `).run(videoId, tagId);

            // Increment usage count
            db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').run(tagId);

            console.log(`✅ Tag assigned to video (video: ${videoId}, tag: ${tagId})`);
            return { success: true };
        } catch (error) {
            console.error('Error assigning tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 7. REMOVE TAG FROM VIDEO
    // ============================================
    ipcMain.handle('tag:removeFromVideo', async (event, videoId, tagId) => {
        try {
            const db = getDatabase();

            const result = db.prepare(
                'DELETE FROM video_tags WHERE video_id = ? AND tag_id = ?'
            ).run(videoId, tagId);

            if (result.changes > 0) {
                // Decrement usage count
                db.prepare(`
                    UPDATE tags 
                    SET usage_count = MAX(0, usage_count - 1) 
                    WHERE id = ?
                `).run(tagId);
            }

            console.log(`✅ Tag removed from video (video: ${videoId}, tag: ${tagId})`);
            return { success: true };
        } catch (error) {
            console.error('Error removing tag:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 8. GET VIDEO TAGS
    // ============================================
    ipcMain.handle('tag:getVideoTags', async (event, videoId) => {
        try {
            const db = getDatabase();

            const tags = db.prepare(`
                SELECT t.* 
                FROM tags t
                INNER JOIN video_tags vt ON t.id = vt.tag_id
                WHERE vt.video_id = ?
                ORDER BY t.name ASC
            `).all(videoId);

            return { success: true, tags };
        } catch (error) {
            console.error('Error getting video tags:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 9. GET TAG VIDEOS
    // ============================================
    ipcMain.handle('tag:getVideos', async (event, tagId) => {
        try {
            const db = getDatabase();

            const videos = db.prepare(`
                SELECT v.* 
                FROM videos v
                INNER JOIN video_tags vt ON v.id = vt.video_id
                WHERE vt.tag_id = ?
                ORDER BY v.title ASC
            `).all(tagId);

            return { success: true, videos };
        } catch (error) {
            console.error('Error getting tag videos:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 10. SET VIDEO TAGS (replace all)
    // ============================================
    ipcMain.handle('tag:setVideoTags', async (event, videoId, tagIds) => {
        try {
            const db = getDatabase();

            // Get current tags
            const currentTags = db.prepare(
                'SELECT tag_id FROM video_tags WHERE video_id = ?'
            ).all(videoId);
            const currentTagIds = currentTags.map(t => t.tag_id);

            // Remove old tags
            db.prepare('DELETE FROM video_tags WHERE video_id = ?').run(videoId);

            // Decrement usage count for removed tags
            for (const tagId of currentTagIds) {
                db.prepare(`
                    UPDATE tags 
                    SET usage_count = MAX(0, usage_count - 1) 
                    WHERE id = ?
                `).run(tagId);
            }

            // Add new tags
            const insertStmt = db.prepare(`
                INSERT INTO video_tags (video_id, tag_id, added_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

            const updateUsageStmt = db.prepare(
                'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?'
            );

            for (const tagId of tagIds) {
                insertStmt.run(videoId, tagId);
                updateUsageStmt.run(tagId);
            }

            console.log(`✅ Video tags updated (video: ${videoId}, tags: ${tagIds.length})`);
            return { success: true };
        } catch (error) {
            console.error('Error setting video tags:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // 11. SEARCH TAGS (for autocomplete)
    // ============================================
    ipcMain.handle('tag:search', async (event, query) => {
        try {
            const db = getDatabase();

            const tags = db.prepare(`
                SELECT * FROM tags 
                WHERE name LIKE ? 
                ORDER BY usage_count DESC, name ASC
                LIMIT 20
            `).all(`%${query}%`);

            return { success: true, tags };
        } catch (error) {
            console.error('Error searching tags:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Tag handlers initialized');
}

module.exports = { initTagHandlers };