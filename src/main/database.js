const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db;
let dbPath;

async function initDatabase() {
    const SQL = await initSqlJs();
    dbPath = path.join(app.getPath('userData'), 'youtube-local.db');

    let buffer;
    if (fs.existsSync(dbPath)) {
        buffer = fs.readFileSync(dbPath);
    }

    db = new SQL.Database(buffer);

    // Crear tablas
    db.run(`
    CREATE TABLE IF NOT EXISTS watch_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_path TEXT NOT NULL UNIQUE,
      last_scan DATETIME,
      is_active INTEGER DEFAULT 1,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP
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
      FOREIGN KEY (watch_folder_id) REFERENCES watch_folders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_filepath ON videos(filepath);
    CREATE INDEX IF NOT EXISTS idx_file_hash ON videos(file_hash);
    CREATE INDEX IF NOT EXISTS idx_available ON videos(is_available);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#FF0000'
    );

    CREATE TABLE IF NOT EXISTS video_categories (
      video_id INTEGER,
      category_id INTEGER,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      PRIMARY KEY (video_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS video_tags (
      video_id INTEGER,
      tag_id INTEGER,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id),
      PRIMARY KEY (video_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_videos (
      playlist_id INTEGER,
      video_id INTEGER,
      position INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      PRIMARY KEY (playlist_id, video_id)
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

    console.log('Base de datos inicializada correctamente');

    // Guardar la base de datos cada 5 segundos
    setInterval(() => {
        saveDatabase();
    }, 5000);

    return db;
}

function saveDatabase() {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

function getDatabase() {
    // Crear wrapper que simula better-sqlite3 API
    return {
        prepare: (sql) => {
            return {
                run: (...params) => {
                    db.run(sql, params);
                    saveDatabase();
                    return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0 };
                },
                get: (...params) => {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    const result = stmt.step() ? stmt.getAsObject() : null;
                    stmt.free();
                    return result;
                },
                all: (...params) => {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return results;
                }
            };
        },
        exec: (sql) => {
            db.run(sql);
            saveDatabase();
        }
    };
}

module.exports = { initDatabase, getDatabase };