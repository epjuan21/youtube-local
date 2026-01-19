// Actualizado: 12 de Enero de 2025 - Fase 5.1 Cache
const { ipcMain } = require('electron');
const { getDatabase } = require('../database');
const cacheManager = require('../cache/CacheManager');

function setupCategoryHandlers() {
    // ============================================
    // CRUD DE CATEGORÍAS
    // ============================================

    // Obtener todas las categorías (con cache)
    ipcMain.handle('category:getAll', async () => {
        try {
            // Intentar obtener del cache
            const cached = cacheManager.get('categories', 'all');
            if (cached) {
                return cached;
            }

            const db = getDatabase();
            const categories = db.prepare(`
        SELECT
          c.*,
          COUNT(vc.video_id) as video_count
        FROM categories c
        LEFT JOIN video_categories vc ON c.id = vc.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
      `).all();

            // Guardar en cache
            cacheManager.set('categories', 'all', categories);

            return categories;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            throw error;
        }
    });

    // Obtener categoría por ID
    ipcMain.handle('category:getById', async (event, categoryId) => {
        try {
            const db = getDatabase();
            const category = db.prepare(`
        SELECT 
          c.*,
          COUNT(vc.video_id) as video_count
        FROM categories c
        LEFT JOIN video_categories vc ON c.id = vc.category_id
        WHERE c.id = ?
        GROUP BY c.id
      `).get(categoryId);

            return category;
        } catch (error) {
            console.error('Error al obtener categoría:', error);
            throw error;
        }
    });

    // Crear nueva categoría
    ipcMain.handle('category:create', async (event, categoryData) => {
        const { name, color = '#3b82f6', icon = '📁', description = '' } = categoryData;

        try {
            const db = getDatabase();

            // Verificar si ya existe
            const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
            if (exists) {
                return { success: false, error: 'Ya existe una categoría con ese nombre' };
            }

            // Insertar nueva categoría
            const result = db.prepare(`
        INSERT INTO categories (name, color, icon, description)
        VALUES (?, ?, ?, ?)
      `).run(name, color, icon, description);

            const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

            // Invalidar cache de categorias
            cacheManager.invalidateCache('categories');

            return { success: true, category: newCategory };
        } catch (error) {
            console.error('Error al crear categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Actualizar categoría
    ipcMain.handle('category:update', async (event, categoryId, updates) => {
        const { name, color, icon, description } = updates;

        try {
            const db = getDatabase();

            // Verificar si el nuevo nombre ya existe (si se está cambiando)
            if (name) {
                const exists = db.prepare(
                    'SELECT id FROM categories WHERE name = ? AND id != ?'
                ).get(name, categoryId);

                if (exists) {
                    return { success: false, error: 'Ya existe una categoría con ese nombre' };
                }
            }

            // Construir query dinámicamente
            const fields = [];
            const values = [];

            if (name !== undefined) {
                fields.push('name = ?');
                values.push(name);
            }
            if (color !== undefined) {
                fields.push('color = ?');
                values.push(color);
            }
            if (icon !== undefined) {
                fields.push('icon = ?');
                values.push(icon);
            }
            if (description !== undefined) {
                fields.push('description = ?');
                values.push(description);
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(categoryId);

            const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
            db.prepare(query).run(...values);

            const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);

            // Invalidar cache de categorias
            cacheManager.invalidateCache('categories');

            return { success: true, category: updatedCategory };
        } catch (error) {
            console.error('Error al actualizar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Eliminar categoría
    ipcMain.handle('category:delete', async (event, categoryId) => {
        try {
            const db = getDatabase();

            // Verificar cuántos videos tienen esta categoría
            const result = db.prepare(`
        SELECT COUNT(*) as video_count 
        FROM video_categories 
        WHERE category_id = ?
      `).get(categoryId);

            // Eliminar relaciones con videos
            db.prepare('DELETE FROM video_categories WHERE category_id = ?').run(categoryId);

            // Eliminar categoría
            db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

            // Invalidar cache de categorias
            cacheManager.invalidateCache('categories');

            return {
                success: true,
                categoryId,
                videosAffected: result.video_count
            };
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // ============================================
    // ASIGNACIÓN DE CATEGORÍAS A VIDEOS
    // ============================================

    // Asignar categoría a video
    ipcMain.handle('category:assignToVideo', async (event, videoId, categoryId) => {
        try {
            const db = getDatabase();

            // Verificar si ya está asignada
            const exists = db.prepare(`
        SELECT 1 FROM video_categories 
        WHERE video_id = ? AND category_id = ?
      `).get(videoId, categoryId);

            if (exists) {
                return { success: true, message: 'La categoría ya estaba asignada' };
            }

            // Asignar categoría
            db.prepare(`
        INSERT INTO video_categories (video_id, category_id)
        VALUES (?, ?)
      `).run(videoId, categoryId);

            return { success: true, videoId, categoryId };
        } catch (error) {
            console.error('Error al asignar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Quitar categoría de video
    ipcMain.handle('category:removeFromVideo', async (event, videoId, categoryId) => {
        try {
            const db = getDatabase();

            db.prepare(`
        DELETE FROM video_categories 
        WHERE video_id = ? AND category_id = ?
      `).run(videoId, categoryId);

            return { success: true, videoId, categoryId };
        } catch (error) {
            console.error('Error al quitar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Obtener categorías de un video
    ipcMain.handle('category:getVideoCategories', async (event, videoId) => {
        try {
            const db = getDatabase();
            const categories = db.prepare(`
        SELECT c.*
        FROM categories c
        INNER JOIN video_categories vc ON c.id = vc.category_id
        WHERE vc.video_id = ?
        ORDER BY c.name ASC
      `).all(videoId);

            return categories;
        } catch (error) {
            console.error('Error al obtener categorías del video:', error);
            throw error;
        }
    });

    // Obtener videos de una categoría
    ipcMain.handle('category:getVideos', async (event, categoryId) => {
        try {
            const db = getDatabase();
            const videos = db.prepare(`
        SELECT v.*
        FROM videos v
        INNER JOIN video_categories vc ON v.id = vc.video_id
        WHERE vc.category_id = ?
        ORDER BY v.title ASC
      `).all(categoryId);

            return videos;
        } catch (error) {
            console.error('Error al obtener videos de la categoría:', error);
            throw error;
        }
    });

    // Asignar múltiples categorías a un video (reemplaza todas)
    ipcMain.handle('category:setVideoCategories', async (event, videoId, categoryIds) => {
        try {
            const db = getDatabase();

            // Eliminar todas las categorías actuales
            db.prepare('DELETE FROM video_categories WHERE video_id = ?').run(videoId);

            // Insertar nuevas categorías
            if (categoryIds && categoryIds.length > 0) {
                const insertStmt = db.prepare(`
          INSERT INTO video_categories (video_id, category_id)
          VALUES (?, ?)
        `);

                for (const categoryId of categoryIds) {
                    insertStmt.run(videoId, categoryId);
                }
            }

            return { success: true, videoId, categoriesAssigned: categoryIds.length };
        } catch (error) {
            console.error('Error al asignar categorías:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('📦 Category handlers registrados (10 APIs)');
}

module.exports = { setupCategoryHandlers };