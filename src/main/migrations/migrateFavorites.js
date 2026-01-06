function migrateFavorites(db) {
    try {
        console.log('🔄 Iniciando migración de favoritos...');

        // Verificar si la columna existe
        let columnExists = false;
        try {
            db.prepare("SELECT is_favorite FROM videos LIMIT 1").get();
            columnExists = true;
        } catch (e) {
            columnExists = false;
        }

        if (columnExists) {
            console.log('✅ Ya migrada');
            return { success: true };
        }

        // Agregar columna
        db.exec(`
            ALTER TABLE videos 
            ADD COLUMN is_favorite INTEGER DEFAULT 0;
        `);

        // Crear índice
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_videos_favorite 
            ON videos(is_favorite);
        `);

        console.log('✅ Migración completada');
        return { success: true };

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

module.exports = { migrateFavorites };