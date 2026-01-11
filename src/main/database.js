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

function initDatabase() {
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
    `);

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
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Base de datos cerrada correctamente');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};