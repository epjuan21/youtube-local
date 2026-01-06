const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

function migrateCategories() {
    const dbPath = path.join(app.getPath('userData'), 'data', 'database.db');
    const db = new Database(dbPath);

    console.log('🏷️  Iniciando migración de categorías...');

    try {
        // Verificar si las tablas ya existen
        const categoriesExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='categories'
    `).get();

        const videoCategoriesExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='video_categories'
    `).get();

        if (categoriesExists && videoCategoriesExists) {
            console.log('✅ Tablas de categorías ya existen');
            db.close();
            return { success: true, message: 'Las tablas ya existen' };
        }

        // Crear tabla categories
        if (!categoriesExists) {
            console.log('📦 Creando tabla categories...');
            db.exec(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          description TEXT,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
            console.log('✅ Tabla categories creada');
        }

        // Crear tabla video_categories (relación N:M)
        if (!videoCategoriesExists) {
            console.log('📦 Creando tabla video_categories...');
            db.exec(`
        CREATE TABLE video_categories (
          video_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (video_id, category_id),
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
      `);
            console.log('✅ Tabla video_categories creada');
        }

        // Crear índices
        console.log('📦 Creando índices...');
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_video_categories_video 
      ON video_categories(video_id);

      CREATE INDEX IF NOT EXISTS idx_video_categories_category 
      ON video_categories(category_id);

      CREATE INDEX IF NOT EXISTS idx_categories_name 
      ON categories(name);
    `);
        console.log('✅ Índices creados');

        // Insertar categorías predeterminadas
        console.log('📦 Insertando categorías predeterminadas...');
        const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO categories (name, color, icon, description)
      VALUES (?, ?, ?, ?)
    `);

        const defaultCategories = [
            { name: 'Tutoriales', color: '#3b82f6', icon: '🎓', description: 'Videos educativos y tutoriales' },
            { name: 'Entretenimiento', color: '#ef4444', icon: '🎬', description: 'Videos de entretenimiento' },
            { name: 'Documentales', color: '#10b981', icon: '📚', description: 'Documentales y contenido informativo' },
            { name: 'Música', color: '#8b5cf6', icon: '🎵', description: 'Videos musicales y conciertos' },
            { name: 'Gaming', color: '#f59e0b', icon: '🎮', description: 'Videos de videojuegos' },
            { name: 'Deportes', color: '#06b6d4', icon: '⚽', description: 'Deportes y actividades físicas' },
        ];

        const insertMany = db.transaction((categories) => {
            for (const cat of categories) {
                insertCategory.run(cat.name, cat.color, cat.icon, cat.description);
            }
        });

        insertMany(defaultCategories);
        console.log('✅ Categorías predeterminadas insertadas');

        db.close();
        console.log('🎉 Migración de categorías completada exitosamente');

        return {
            success: true,
            message: 'Migración completada exitosamente',
            categoriesCreated: defaultCategories.length
        };
    } catch (error) {
        console.error('❌ Error en migración de categorías:', error);
        db.close();
        throw error;
    }
}

module.exports = { migrateCategories };