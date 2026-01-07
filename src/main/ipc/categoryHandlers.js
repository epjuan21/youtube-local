const { ipcMain } = require('electron');
const { getDatabase } = require('../database');

function setupCategoryHandlers() {
    // ============================================
    // CRUD DE CATEGORÍAS
    // ============================================

    // Obtener todas las categorías
    ipcMain.handle('category:getAll', async () => {
        const db = getDatabase();
        try {
            const stmt = db.prepare(`
        SELECT 
          c.*,
          COUNT(vc.video_id) as video_count
        FROM categories c
        LEFT JOIN video_categories vc ON c.id = vc.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
      `);

            const categories = [];
            while (stmt.step()) {
                categories.push(stmt.getAsObject());
            }
            stmt.free();

            return categories;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            throw error;
        }
    });

    // Obtener categoría por ID
    ipcMain.handle('category:getById', async (event, categoryId) => {
        const db = getDatabase();
        try {
            const stmt = db.prepare(`
        SELECT 
          c.*,
          COUNT(vc.video_id) as video_count
        FROM categories c
        LEFT JOIN video_categories vc ON c.id = vc.category_id
        WHERE c.id = ?
        GROUP BY c.id
      `);
            stmt.bind([categoryId]);

            const category = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();

            return category;
        } catch (error) {
            console.error('Error al obtener categoría:', error);
            throw error;
        }
    });

    // Crear nueva categoría
    ipcMain.handle('category:create', async (event, categoryData) => {
        const db = getDatabase();
        const { name, color = '#3b82f6', icon = '📁', description = '' } = categoryData;

        try {
            // Verificar si ya existe
            const checkStmt = db.prepare('SELECT id FROM categories WHERE name = ?');
            checkStmt.bind([name]);
            const exists = checkStmt.step();
            checkStmt.free();

            if (exists) {
                return { success: false, error: 'Ya existe una categoría con ese nombre' };
            }

            // Insertar nueva categoría
            db.run(`
        INSERT INTO categories (name, color, icon, description)
        VALUES (?, ?, ?, ?)
      `, [name, color, icon, description]);

            // Obtener la categoría creada
            const stmt = db.prepare('SELECT * FROM categories WHERE name = ?');
            stmt.bind([name]);
            const newCategory = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();

            return { success: true, category: newCategory };
        } catch (error) {
            console.error('Error al crear categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Actualizar categoría
    ipcMain.handle('category:update', async (event, categoryId, updates) => {
        const db = getDatabase();
        const { name, color, icon, description } = updates;

        try {
            // Verificar si el nuevo nombre ya existe (si se está cambiando)
            if (name) {
                const checkStmt = db.prepare(
                    'SELECT id FROM categories WHERE name = ? AND id != ?'
                );
                checkStmt.bind([name, categoryId]);
                const exists = checkStmt.step();
                checkStmt.free();

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
            db.run(query, values);

            // Obtener categoría actualizada
            const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
            stmt.bind([categoryId]);
            const updatedCategory = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();

            return { success: true, category: updatedCategory };
        } catch (error) {
            console.error('Error al actualizar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Eliminar categoría
    ipcMain.handle('category:delete', async (event, categoryId) => {
        const db = getDatabase();
        try {
            // Verificar cuántos videos tienen esta categoría
            const countStmt = db.prepare(`
        SELECT COUNT(*) as video_count 
        FROM video_categories 
        WHERE category_id = ?
      `);
            countStmt.bind([categoryId]);
            const result = countStmt.step() ? countStmt.getAsObject() : { video_count: 0 };
            countStmt.free();

            // Eliminar relaciones con videos
            db.run('DELETE FROM video_categories WHERE category_id = ?', [categoryId]);

            // Eliminar categoría
            db.run('DELETE FROM categories WHERE id = ?', [categoryId]);

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
        const db = getDatabase();
        try {
            // Verificar si ya está asignada
            const checkStmt = db.prepare(`
        SELECT 1 FROM video_categories 
        WHERE video_id = ? AND category_id = ?
      `);
            checkStmt.bind([videoId, categoryId]);
            const exists = checkStmt.step();
            checkStmt.free();

            if (exists) {
                return { success: true, message: 'La categoría ya estaba asignada' };
            }

            // Asignar categoría
            db.run(`
        INSERT INTO video_categories (video_id, category_id)
        VALUES (?, ?)
      `, [videoId, categoryId]);

            return { success: true, videoId, categoryId };
        } catch (error) {
            console.error('Error al asignar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Quitar categoría de video
    ipcMain.handle('category:removeFromVideo', async (event, videoId, categoryId) => {
        const db = getDatabase();
        try {
            db.run(`
        DELETE FROM video_categories 
        WHERE video_id = ? AND category_id = ?
      `, [videoId, categoryId]);

            return { success: true, videoId, categoryId };
        } catch (error) {
            console.error('Error al quitar categoría:', error);
            return { success: false, error: error.message };
        }
    });

    // Obtener categorías de un video
    ipcMain.handle('category:getVideoCategories', async (event, videoId) => {
        const db = getDatabase();
        try {
            const stmt = db.prepare(`
        SELECT c.*
        FROM categories c
        INNER JOIN video_categories vc ON c.id = vc.category_id
        WHERE vc.video_id = ?
        ORDER BY c.name ASC
      `);
            stmt.bind([videoId]);

            const categories = [];
            while (stmt.step()) {
                categories.push(stmt.getAsObject());
            }
            stmt.free();

            return categories;
        } catch (error) {
            console.error('Error al obtener categorías del video:', error);
            throw error;
        }
    });

    // Obtener videos de una categoría
    ipcMain.handle('category:getVideos', async (event, categoryId) => {
        const db = getDatabase();
        try {
            const stmt = db.prepare(`
        SELECT v.*
        FROM videos v
        INNER JOIN video_categories vc ON v.id = vc.video_id
        WHERE vc.category_id = ?
        ORDER BY v.title ASC
      `);
            stmt.bind([categoryId]);

            const videos = [];
            while (stmt.step()) {
                videos.push(stmt.getAsObject());
            }
            stmt.free();

            return videos;
        } catch (error) {
            console.error('Error al obtener videos de la categoría:', error);
            throw error;
        }
    });

    // Asignar múltiples categorías a un video (reemplaza todas)
    ipcMain.handle('category:setVideoCategories', async (event, videoId, categoryIds) => {
        const db = getDatabase();
        try {
            // Eliminar todas las categorías actuales
            db.run('DELETE FROM video_categories WHERE video_id = ?', [videoId]);

            // Insertar nuevas categorías
            if (categoryIds && categoryIds.length > 0) {
                for (const categoryId of categoryIds) {
                    db.run(`
            INSERT INTO video_categories (video_id, category_id)
            VALUES (?, ?)
          `, [videoId, categoryId]);
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