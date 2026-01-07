const { getDatabase } = require('../database');

async function migrateFavorites() {
    const db = getDatabase();

    console.log('⭐ Iniciando migración de favoritos...');

    try {
        // Verificar si la columna ya existe
        const stmt = db.prepare(`
      PRAGMA table_info(videos)
    `);

        const columns = [];
        while (stmt.step()) {
            columns.push(stmt.getAsObject());
        }
        stmt.free();

        const hasFavoriteColumn = columns.some(col => col.name === 'is_favorite');

        if (hasFavoriteColumn) {
            console.log('✅ La columna is_favorite ya existe');
            return { success: true, message: 'La columna ya existe' };
        }

        // Agregar columna is_favorite
        console.log('📦 Agregando columna is_favorite...');
        db.run(`
      ALTER TABLE videos ADD COLUMN is_favorite INTEGER DEFAULT 0
    `);
        console.log('✅ Columna is_favorite agregada');

        // Crear índice
        console.log('📦 Creando índice...');
        db.run(`
      CREATE INDEX IF NOT EXISTS idx_videos_favorite ON videos(is_favorite)
    `);
        console.log('✅ Índice creado');

        console.log('🎉 Migración de favoritos completada exitosamente');

        return {
            success: true,
            message: 'Migración completada exitosamente'
        };
    } catch (error) {
        console.error('❌ Error en migración de favoritos:', error);
        throw error;
    }
}

module.exports = { migrateFavorites };