const { ipcMain } = require('electron');
const { generateThumbnail, getVideoMetadata, getThumbnailsDirectory } = require('../thumbnailGenerator');
const { getDatabase } = require('../database');
const path = require('path');
const fs = require('fs');

function setupThumbnailHandlers() {
  // Generar thumbnail para un video específico
  ipcMain.handle('generate-thumbnail', async (event, videoId) => {
    try {
      const db = getDatabase();
      const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
      
      if (!video) {
        throw new Error('Video no encontrado');
      }

      if (!fs.existsSync(video.filepath)) {
        throw new Error('Archivo de video no existe');
      }

      // Generar thumbnail
      const thumbnailPath = await generateThumbnail(video.filepath, video.file_hash);
      
      // Actualizar en base de datos
      db.prepare('UPDATE videos SET thumbnail = ? WHERE id = ?').run(thumbnailPath, videoId);
      
      return { success: true, thumbnailPath };
    } catch (error) {
      console.error('Error generando thumbnail:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener ruta del thumbnail
  ipcMain.handle('get-thumbnail-path', async (event, videoId) => {
    try {
      const db = getDatabase();
      const video = db.prepare('SELECT thumbnail FROM videos WHERE id = ?').get(videoId);
      
      if (!video || !video.thumbnail) {
        return null;
      }

      // Verificar que el archivo existe
      if (fs.existsSync(video.thumbnail)) {
        return video.thumbnail;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo thumbnail:', error);
      return null;
    }
  });

  // Regenerar todos los thumbnails
  ipcMain.handle('regenerate-all-thumbnails', async (event) => {
    try {
      const db = getDatabase();
      const videos = db.prepare('SELECT * FROM videos WHERE is_available = 1').all();
      
      let success = 0;
      let failed = 0;

      for (const video of videos) {
        try {
          if (fs.existsSync(video.filepath)) {
            const thumbnailPath = await generateThumbnail(video.filepath, video.file_hash);
            db.prepare('UPDATE videos SET thumbnail = ? WHERE id = ?').run(thumbnailPath, video.id);
            success++;
          }
        } catch (error) {
          console.error(`Error regenerando thumbnail para ${video.filename}:`, error);
          failed++;
        }
      }

      return { success, failed, total: videos.length };
    } catch (error) {
      console.error('Error regenerando thumbnails:', error);
      throw error;
    }
  });

  // Obtener metadatos de video
  ipcMain.handle('get-video-metadata', async (event, videoId) => {
    try {
      const db = getDatabase();
      const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
      
      if (!video || !fs.existsSync(video.filepath)) {
        throw new Error('Video no encontrado');
      }

      const metadata = await getVideoMetadata(video.filepath);
      return metadata;
    } catch (error) {
      console.error('Error obteniendo metadatos:', error);
      throw error;
    }
  });

  // Obtener directorio de thumbnails
  ipcMain.handle('get-thumbnails-directory', async () => {
    return getThumbnailsDirectory();
  });
}

module.exports = { setupThumbnailHandlers };