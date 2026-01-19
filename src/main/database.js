// src/main/database.js (Versión better-sqlite3)
// 
// ✅ Esta versión usa better-sqlite3 que:
// - Soporta ALTER TABLE nativamente
// - Es 10x-20x más rápido que sql.js
// - No requiere guardar manualmente
// - Es el estándar para aplicaciones Electron
//
// 📁 Base de datos ubicada en: D:\React\youtube-local\database\youtube-local.db

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;
let isClosing = false; // Bandera para indicar si la app se está cerrando

function initDatabase() {
  isClosing = false; // Reiniciar la bandera al inicializar
  // ✅ RUTA PERSONALIZADA: Carpeta database en el proyecto
  const projectRoot = path.join(__dirname, '..', '..');
  const dbDir = path.join(projectRoot, 'database');
  const dbPath = path.join(dbDir, 'youtube-local.db');

  // Crear directorio database si no existe
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Carpeta database creada en: ${dbDir}`);
  }

  console.log(`📦 Inicializando base de datos en: ${dbPath}`);

  // Abrir/crear base de datos
  db = new Database(dbPath);

  // Configurar pragmas para mejor rendimiento
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // Crear tablas con TODAS las columnas necesarias
  db.exec(`
        CREATE TABLE IF NOT EXISTS watch_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_path TEXT NOT NULL,
            last_scan DATETIME,
            is_active INTEGER DEFAULT 1,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            disk_identifier TEXT,
            disk_mount_point TEXT,
            relative_path TEXT
        );

        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_hash TEXT UNIQUE,
            thumbnail TEXT,
            duration INTEGER,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            dislikes INTEGER DEFAULT 0,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            file_size INTEGER,
            file_modified_date DATETIME,
            last_watched DATETIME,
            watch_time INTEGER DEFAULT 0,
            is_available INTEGER DEFAULT 1,
            watch_folder_id INTEGER,
            disk_identifier TEXT,
            relative_filepath TEXT,
            is_favorite INTEGER DEFAULT 0,
            rating INTEGER DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            resolution TEXT DEFAULT NULL,
            width INTEGER DEFAULT NULL,
            height INTEGER DEFAULT NULL,
            video_codec TEXT DEFAULT NULL,
            audio_codec TEXT DEFAULT NULL,
            metadata_extracted INTEGER DEFAULT 0,            
            FOREIGN KEY (watch_folder_id) REFERENCES watch_folders(id)
        );

        CREATE INDEX IF NOT EXISTS idx_filepath ON videos(filepath);
        CREATE INDEX IF NOT EXISTS idx_file_hash ON videos(file_hash);
        CREATE INDEX IF NOT EXISTS idx_available ON videos(is_available);
        CREATE INDEX IF NOT EXISTS idx_videos_disk ON videos(disk_identifier);
        CREATE INDEX IF NOT EXISTS idx_videos_favorite ON videos(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_videos_rating ON videos(rating);
        CREATE INDEX IF NOT EXISTS idx_videos_resolution ON videos(resolution);
        CREATE INDEX IF NOT EXISTS idx_videos_metadata_extracted ON videos(metadata_extracted);        
        CREATE INDEX IF NOT EXISTS idx_watch_folders_disk ON watch_folders(disk_identifier);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_folders_unique ON watch_folders(disk_identifier, relative_path);

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#3b82f6',
            description TEXT,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS video_categories (
            video_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (video_id, category_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_video_categories_video ON video_categories(video_id);
        CREATE INDEX IF NOT EXISTS idx_video_categories_category ON video_categories(category_id);
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

       CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            color TEXT DEFAULT '#6b7280',
            usage_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

      CREATE TABLE IF NOT EXISTS video_tags (
          video_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (video_id, tag_id),
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
        CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
        CREATE INDEX IF NOT EXISTS idx_video_tags_video ON video_tags(video_id);
        CREATE INDEX IF NOT EXISTS idx_video_tags_tag ON video_tags(tag_id);        

        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          thumbnail TEXT,
          color TEXT DEFAULT '#10b981',
          video_count INTEGER DEFAULT 0,
          total_duration INTEGER DEFAULT 0,
          is_public INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlist_videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playlist_id INTEGER NOT NULL,
          video_id INTEGER NOT NULL,
          position INTEGER NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          UNIQUE(playlist_id, video_id)
        );

        CREATE TABLE IF NOT EXISTS sync_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            watch_folder_id INTEGER,
            videos_added INTEGER DEFAULT 0,
            videos_removed INTEGER DEFAULT 0,
            videos_updated INTEGER DEFAULT 0,
            sync_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (watch_folder_id) REFERENCES watch_folders(id)
        );

        CREATE TABLE IF NOT EXISTS watch_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            progress_seconds INTEGER DEFAULT 0,
            duration_seconds INTEGER DEFAULT 0,
            percentage_watched REAL DEFAULT 0,
            completed INTEGER DEFAULT 0,
            session_id TEXT,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        );      
        
        CREATE TABLE IF NOT EXISTS watch_progress (
            video_id INTEGER PRIMARY KEY,
            last_position INTEGER DEFAULT 0,
            last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_watch_time INTEGER DEFAULT 0,
            watch_count INTEGER DEFAULT 0,
            completed_count INTEGER DEFAULT 0,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        );      
        
        CREATE INDEX IF NOT EXISTS idx_watch_history_video ON watch_history(video_id);
        CREATE INDEX IF NOT EXISTS idx_watch_history_date ON watch_history(watched_at);
        CREATE INDEX IF NOT EXISTS idx_watch_progress_last ON watch_progress(last_watched);
    `);

  // Crear índices optimizados para queries frecuentes
  createOptimizedIndexes();

  // Inicializar Full-Text Search
  initializeFTS();

  console.log('✅ Base de datos inicializada correctamente (better-sqlite3)');
  console.log('✅ Modo: WAL (Write-Ahead Logging)');
  console.log('✅ Foreign keys: ACTIVADAS');
  console.log(`📁 Archivos de BD:`);
  console.log(`   - ${dbPath}`);
  console.log(`   - ${dbPath}-wal (Write-Ahead Log)`);
  console.log(`   - ${dbPath}-shm (Shared Memory)`);

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('❌ Database no inicializada. Llama a initDatabase() primero.');
  }
  if (isClosing) {
    throw new Error('⚠️ Database cerrándose. No se aceptan nuevas operaciones.');
  }
  return db;
}

function isDatabaseClosing() {
  return isClosing;
}

function closeDatabase() {
  if (db) {
    isClosing = true; // Marcar que estamos cerrando
    db.close();
    db = null;
    console.log('✅ Base de datos cerrada correctamente');
  }
}

// ============================================================================
// FASE 5.1: OPTIMIZACIÓN DE BASE DE DATOS
// ============================================================================

/**
 * Crear índices compuestos optimizados para queries frecuentes
 * Estos índices mejoran el rendimiento de filtros combinados
 */
function createOptimizedIndexes() {
  console.log('🔧 Creando índices optimizados...');

  const indexes = [
    // Índice compuesto para filtrar videos disponibles ordenados por fecha
    `CREATE INDEX IF NOT EXISTS idx_videos_available_date
     ON videos(is_available, upload_date DESC)`,

    // Índice compuesto para filtrar videos disponibles ordenados por vistas
    `CREATE INDEX IF NOT EXISTS idx_videos_available_views
     ON videos(is_available, views DESC)`,

    // Índice compuesto para filtrar por carpeta y disponibilidad
    `CREATE INDEX IF NOT EXISTS idx_videos_folder_available
     ON videos(watch_folder_id, is_available)`,

    // Índice parcial para videos con rating (ordenados por rating y vistas)
    `CREATE INDEX IF NOT EXISTS idx_videos_rating_views
     ON videos(rating DESC, views DESC) WHERE rating IS NOT NULL`,

    // Índice compuesto para filtrar videos disponibles ordenados por duración
    `CREATE INDEX IF NOT EXISTS idx_videos_available_duration
     ON videos(is_available, duration DESC)`,

    // Índice compuesto para búsqueda por carpeta y fecha
    `CREATE INDEX IF NOT EXISTS idx_videos_folder_date
     ON videos(watch_folder_id, upload_date DESC)`,

    // Índice para última visualización (continuar viendo)
    `CREATE INDEX IF NOT EXISTS idx_videos_last_watched
     ON videos(last_watched DESC) WHERE last_watched IS NOT NULL`
  ];

  for (const indexSQL of indexes) {
    try {
      db.exec(indexSQL);
    } catch (error) {
      // Ignorar errores de índices que ya existen
      if (!error.message.includes('already exists')) {
        console.warn(`⚠️ Error creando índice: ${error.message}`);
      }
    }
  }

  console.log('✅ Índices optimizados creados/verificados');
}

/**
 * Inicializar Full-Text Search (FTS5) para búsquedas rápidas
 * FTS5 es significativamente más rápido que LIKE para búsquedas de texto
 */
function initializeFTS() {
  console.log('🔧 Inicializando Full-Text Search (FTS5)...');

  try {
    // Crear tabla virtual FTS5
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
        title,
        description,
        filename,
        content='videos',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 1'
      )
    `);

    // Verificar si ya existen los triggers
    const triggerExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='trigger' AND name='videos_fts_insert'
    `).get();

    if (!triggerExists) {
      // Crear triggers para mantener FTS sincronizado
      db.exec(`
        -- Trigger para INSERT
        CREATE TRIGGER videos_fts_insert AFTER INSERT ON videos BEGIN
          INSERT INTO videos_fts(rowid, title, description, filename)
          VALUES (new.id, new.title, new.description, new.filename);
        END;

        -- Trigger para DELETE
        CREATE TRIGGER videos_fts_delete AFTER DELETE ON videos BEGIN
          INSERT INTO videos_fts(videos_fts, rowid, title, description, filename)
          VALUES('delete', old.id, old.title, old.description, old.filename);
        END;

        -- Trigger para UPDATE
        CREATE TRIGGER videos_fts_update AFTER UPDATE ON videos
        WHEN old.title != new.title OR old.description != new.description OR old.filename != new.filename
        BEGIN
          INSERT INTO videos_fts(videos_fts, rowid, title, description, filename)
          VALUES('delete', old.id, old.title, old.description, old.filename);
          INSERT INTO videos_fts(rowid, title, description, filename)
          VALUES (new.id, new.title, new.description, new.filename);
        END
      `);

      console.log('✅ Triggers FTS5 creados');
    }

    // Verificar si FTS necesita población inicial
    const ftsCount = db.prepare('SELECT COUNT(*) as count FROM videos_fts').get();
    const videosCount = db.prepare('SELECT COUNT(*) as count FROM videos').get();

    if (ftsCount.count === 0 && videosCount.count > 0) {
      console.log(`📝 Poblando índice FTS con ${videosCount.count} videos existentes...`);
      populateFTS();
    }

    console.log('✅ Full-Text Search (FTS5) inicializado');
  } catch (error) {
    console.error('❌ Error inicializando FTS5:', error.message);
  }
}

/**
 * Poblar índice FTS con datos existentes
 * Se ejecuta automáticamente si FTS está vacío pero hay videos
 */
function populateFTS() {
  try {
    db.exec(`
      INSERT INTO videos_fts(rowid, title, description, filename)
      SELECT id, title, description, filename FROM videos
    `);
    console.log('✅ Índice FTS poblado con datos existentes');
  } catch (error) {
    console.error('❌ Error poblando FTS:', error.message);
  }
}

/**
 * Buscar videos usando Full-Text Search
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Límite de resultados (default 50)
 * @param {boolean} availableOnly - Solo videos disponibles (default true)
 * @returns {Array} Videos que coinciden con la búsqueda
 */
function searchFTS(query, limit = 50, availableOnly = true) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Preparar query para FTS5 (agregar * para búsqueda parcial)
    const ftsQuery = query.trim().split(/\s+/).map(term => `${term}*`).join(' ');

    let sql = `
      SELECT v.*,
             bm25(videos_fts) as relevance
      FROM videos v
      JOIN videos_fts fts ON v.id = fts.rowid
      WHERE videos_fts MATCH ?
    `;

    if (availableOnly) {
      sql += ' AND v.is_available = 1';
    }

    sql += ' ORDER BY relevance LIMIT ?';

    const results = db.prepare(sql).all(ftsQuery, limit);
    return results;
  } catch (error) {
    console.error('❌ Error en búsqueda FTS:', error.message);
    // Fallback a búsqueda LIKE si FTS falla
    return searchLIKE(query, limit, availableOnly);
  }
}

/**
 * Búsqueda fallback usando LIKE (más lenta pero siempre funciona)
 */
function searchLIKE(query, limit = 50, availableOnly = true) {
  const searchPattern = `%${query}%`;

  let sql = `
    SELECT * FROM videos
    WHERE (title LIKE ? OR description LIKE ? OR filename LIKE ?)
  `;

  if (availableOnly) {
    sql += ' AND is_available = 1';
  }

  sql += ' ORDER BY views DESC LIMIT ?';

  return db.prepare(sql).all(searchPattern, searchPattern, searchPattern, limit);
}

/**
 * Reconstruir índice FTS (útil si se corrompe o desincroniza)
 */
function rebuildFTS() {
  console.log('🔧 Reconstruyendo índice FTS...');
  try {
    // Vaciar FTS
    db.exec(`DELETE FROM videos_fts`);
    // Repoblar
    populateFTS();
    // Optimizar
    db.exec(`INSERT INTO videos_fts(videos_fts) VALUES('optimize')`);
    console.log('✅ Índice FTS reconstruido');
    return { success: true };
  } catch (error) {
    console.error('❌ Error reconstruyendo FTS:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// FUNCIONES DE MANTENIMIENTO DE BASE DE DATOS
// ============================================================================

/**
 * Obtener ruta de la base de datos
 */
function getDatabasePath() {
  const projectRoot = path.join(__dirname, '..', '..');
  return path.join(projectRoot, 'database', 'youtube-local.db');
}

/**
 * Ejecutar ANALYZE para optimizar el query planner
 */
function analyzeDatabase() {
  console.log('🔧 Ejecutando ANALYZE...');
  db.exec('ANALYZE');
  console.log('✅ ANALYZE completado');
  return { success: true, message: 'ANALYZE completed' };
}

/**
 * Ejecutar VACUUM para compactar la base de datos
 */
function vacuumDatabase() {
  console.log('🔧 Ejecutando VACUUM...');
  db.exec('VACUUM');
  console.log('✅ VACUUM completado');
  return { success: true, message: 'VACUUM completed' };
}

/**
 * Forzar checkpoint de WAL
 */
function checkpointDatabase() {
  console.log('🔧 Ejecutando WAL checkpoint...');
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('✅ WAL checkpoint completado');
  return { success: true };
}

/**
 * Obtener estadísticas de la base de datos
 */
function getDatabaseStats() {
  const dbPath = getDatabasePath();
  const stats = fs.statSync(dbPath);

  // Obtener información de tablas
  const tables = db.prepare(`
    SELECT
      m.name as table_name,
      (SELECT COUNT(*) FROM pragma_table_info(m.name)) as column_count
    FROM sqlite_master m
    WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '%_fts%'
    ORDER BY m.name
  `).all();

  // Contar registros por tabla
  const tableCounts = {};
  for (const table of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.table_name}"`).get();
      tableCounts[table.table_name] = count.count;
    } catch (e) {
      tableCounts[table.table_name] = 0;
    }
  }

  // Obtener índices
  const indexes = db.prepare(`
    SELECT name, tbl_name as table_name
    FROM sqlite_master
    WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `).all();

  // Verificar tamaño de archivos WAL
  let walSize = 0;
  let shmSize = 0;
  try {
    if (fs.existsSync(`${dbPath}-wal`)) {
      walSize = fs.statSync(`${dbPath}-wal`).size;
    }
    if (fs.existsSync(`${dbPath}-shm`)) {
      shmSize = fs.statSync(`${dbPath}-shm`).size;
    }
  } catch (e) {}

  return {
    path: dbPath,
    sizeBytes: stats.size,
    sizeMB: (stats.size / 1024 / 1024).toFixed(2),
    walSizeBytes: walSize,
    walSizeMB: (walSize / 1024 / 1024).toFixed(2),
    tables: tables.map(t => ({
      name: t.table_name,
      columns: t.column_count,
      rows: tableCounts[t.table_name] || 0
    })),
    indexCount: indexes.length,
    indexes: indexes,
    journalMode: db.pragma('journal_mode', { simple: true }),
    foreignKeys: db.pragma('foreign_keys', { simple: true })
  };
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  isDatabaseClosing,
  // Fase 5.1: Optimización
  searchFTS,
  searchLIKE,
  rebuildFTS,
  populateFTS,
  getDatabasePath,
  analyzeDatabase,
  vacuumDatabase,
  checkpointDatabase,
  getDatabaseStats
};