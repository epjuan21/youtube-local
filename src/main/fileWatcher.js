const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('./database');
const { generateFileHash } = require('./scanner');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'];
let watchers = new Map();

function initFileWatcher(mainWindow) {
    const db = getDatabase();
    const folders = db.prepare('SELECT * FROM watch_folders WHERE is_active = 1').all();

    for (const folder of folders) {
        startWatching(folder, mainWindow);
    }
}

function startWatching(folder, mainWindow) {
    if (watchers.has(folder.id)) {
        return; // Ya está siendo monitoreado
    }

    const watcher = chokidar.watch(folder.folder_path, {
        ignored: /(^|[\/\\])\../, // Ignorar archivos ocultos
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (filepath) => handleFileAdded(filepath, folder, mainWindow))
        .on('unlink', (filepath) => handleFileRemoved(filepath, folder, mainWindow))
        .on('change', (filepath) => handleFileChanged(filepath, folder, mainWindow))
        .on('error', (error) => console.error(`Error en watcher:`, error));

    watchers.set(folder.id, watcher);
    console.log(`Monitoreando carpeta: ${folder.folder_path}`);
}

function stopWatching(folderId) {
    const watcher = watchers.get(folderId);
    if (watcher) {
        watcher.close();
        watchers.delete(folderId);
    }
}

function handleFileAdded(filepath, folder, mainWindow) {
    const ext = path.extname(filepath).toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) return;

    try {
        const stats = fs.statSync(filepath);
        const fileHash = generateFileHash(filepath, stats.size);
        const filename = path.basename(filepath);
        const title = path.basename(filename, ext);

        const db = getDatabase();

        // Verificar si ya existe
        const existing = db.prepare('SELECT * FROM videos WHERE file_hash = ?').get(fileHash);

        if (existing) {
            // Actualizar si estaba marcado como no disponible
            if (!existing.is_available) {
                db.prepare('UPDATE videos SET filepath = ?, is_available = 1 WHERE id = ?')
                    .run(filepath, existing.id);

                mainWindow.webContents.send('file-changed', {
                    type: 'restored',
                    video: { ...existing, filepath, is_available: 1 }
                });
            }
        } else {
            // Agregar nuevo video
            const result = db.prepare(`
        INSERT INTO videos (
          title, filename, filepath, file_hash, file_size,
          file_modified_date, watch_folder_id, is_available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(title, filename, filepath, fileHash, stats.size, stats.mtime, folder.id);

            mainWindow.webContents.send('file-changed', {
                type: 'added',
                video: {
                    id: result.lastInsertRowid,
                    title,
                    filename,
                    filepath,
                    file_size: stats.size
                }
            });
        }
    } catch (err) {
        console.error(`Error procesando archivo agregado ${filepath}:`, err);
    }
}

function handleFileRemoved(filepath, folder, mainWindow) {
    const ext = path.extname(filepath).toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) return;

    const db = getDatabase();
    const video = db.prepare('SELECT * FROM videos WHERE filepath = ?').get(filepath);

    if (video) {
        // Marcar como no disponible en lugar de eliminar
        db.prepare('UPDATE videos SET is_available = 0 WHERE id = ?').run(video.id);

        mainWindow.webContents.send('file-changed', {
            type: 'removed',
            video: { ...video, is_available: 0 }
        });
    }
}

function handleFileChanged(filepath, folder, mainWindow) {
    const ext = path.extname(filepath).toLowerCase();
    if (!VIDEO_EXTENSIONS.includes(ext)) return;

    try {
        const stats = fs.statSync(filepath);
        const db = getDatabase();

        db.prepare('UPDATE videos SET file_size = ?, file_modified_date = ? WHERE filepath = ?')
            .run(stats.size, stats.mtime, filepath);

        mainWindow.webContents.send('file-changed', {
            type: 'modified',
            filepath
        });
    } catch (err) {
        console.error(`Error procesando archivo modificado ${filepath}:`, err);
    }
}

module.exports = {
    initFileWatcher,
    startWatching,
    stopWatching
};