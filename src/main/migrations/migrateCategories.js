const { getDatabase } = require('../database');

async function migrateCategories() {
  const db = getDatabase();

  console.log('🏷️  Iniciando migración de categorías...');

  try {
    // Verificar si las tablas ya existen
    const stmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='categories'
    `);
    const categoriesExists = stmt.get();
    stmt.free();

    const stmt2 = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='video_categories'
    `);
    const videoCategoriesExists = stmt2.get();
    stmt2.free();

    if (categoriesExists && videoCategoriesExists) {
      console.log('✅ Tablas de categorías ya existen');
      return { success: true, message: 'Las tablas ya existen' };
    }

    // Crear tabla categories
    if (!categoriesExists) {
      console.log('📦 Creando tabla categories...');
      db.run(`
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          description TEXT,
          icon TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla categories creada');
    }

    // Crear tabla video_categories (relación N:M)
    if (!videoCategoriesExists) {
      console.log('📦 Creando tabla video_categories...');
      db.run(`
        CREATE TABLE video_categories (
          video_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (video_id, category_id),
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Tabla video_categories creada');
    }

    // Crear índices
    console.log('📦 Creando índices...');
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_video_categories_video 
      ON video_categories(video_id)
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_video_categories_category 
      ON video_categories(category_id)
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_categories_name 
      ON categories(name)
    `);
    console.log('✅ Índices creados');

    // Insertar categorías predeterminadas
    console.log('📦 Insertando categorías predeterminadas...');

    const defaultCategories = [
      { name: 'Tutoriales', color: '#3b82f6', icon: '🎓', description: 'Videos educativos y tutoriales' },
      { name: 'Entretenimiento', color: '#ef4444', icon: '🎬', description: 'Videos de entretenimiento' },
      { name: 'Documentales', color: '#10b981', icon: '📚', description: 'Documentales y contenido informativo' },
      { name: 'Música', color: '#8b5cf6', icon: '🎵', description: 'Videos musicales y conciertos' },
      { name: 'Gaming', color: '#f59e0b', icon: '🎮', description: 'Videos de videojuegos' },
      { name: 'Deportes', color: '#06b6d4', icon: '⚽', description: 'Deportes y actividades físicas' },
    ];

    for (const cat of defaultCategories) {
      try {
        db.run(`
          INSERT OR IGNORE INTO categories (name, color, icon, description)
          VALUES (?, ?, ?, ?)
        `, [cat.name, cat.color, cat.icon, cat.description]);
      } catch (error) {
        console.error(`Error insertando categoría ${cat.name}:`, error);
      }
    }

    console.log('✅ Categorías predeterminadas insertadas');
    console.log('🎉 Migración de categorías completada exitosamente');

    return {
      success: true,
      message: 'Migración completada exitosamente',
      categoriesCreated: defaultCategories.length
    };
  } catch (error) {
    console.error('❌ Error en migración de categorías:', error);
    throw error;
  }
}

module.exports = { migrateCategories };