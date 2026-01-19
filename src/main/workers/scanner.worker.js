// src/main/workers/scanner.worker.js
// Worker thread for file system scanning

const { parentPort } = require('worker_threads');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { MESSAGE_TYPES } = require('./workerTypes');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'];

/**
 * Scan directory recursively for video files
 * @param {Object} data - Task data
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Scan results
 */
async function scanDirectory(data, onProgress) {
  const { directoryPath, recursive = true } = data;
  const videos = [];
  let filesProcessed = 0;

  /**
   * Recursively walk directory tree
   * @param {string} dir - Directory to walk
   * @param {number} depth - Current depth
   */
  async function walkDir(dir, depth = 0) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden files and system folders
        if (
          entry.name.startsWith('.') ||
          entry.name.startsWith('$') ||
          entry.name === 'System Volume Information' ||
          entry.name === '$RECYCLE.BIN' ||
          entry.name === 'RECYCLER'
        ) {
          continue;
        }

        if (entry.isDirectory() && recursive) {
          // Recursively scan subdirectories
          await walkDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          filesProcessed++;

          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.includes(ext)) {
            try {
              const stats = await fs.stat(fullPath);

              videos.push({
                filename: entry.name,
                filepath: fullPath,
                fileSize: stats.size,
                fileModifiedDate: stats.mtime.toISOString(),
                directory: dir,
              });

              // Report progress every 50 files
              if (filesProcessed % 50 === 0 && onProgress) {
                onProgress({
                  filesProcessed,
                  videosFound: videos.length,
                  currentPath: fullPath,
                });
              }
            } catch (statErr) {
              // Skip files we can't stat (permission errors, etc.)
              console.error(`Error stating file ${fullPath}:`, statErr.message);
            }
          }
        }
      }
    } catch (err) {
      // Log error but continue scanning other directories
      console.error(`Error scanning directory ${dir}:`, err.message);
    }
  }

  await walkDir(directoryPath);

  return {
    videos,
    filesProcessed,
    videosFound: videos.length,
  };
}

// Listen for messages from main thread
parentPort.on('message', async (message) => {
  const { taskId, type, data } = message;

  // Handle shutdown request
  if (type === MESSAGE_TYPES.SHUTDOWN) {
    parentPort.postMessage({ type: MESSAGE_TYPES.SHUTDOWN_ACK });
    return;
  }

  // Handle ping (health check)
  if (type === MESSAGE_TYPES.PING) {
    parentPort.postMessage({ type: MESSAGE_TYPES.PONG });
    return;
  }

  // Handle directory scan task
  if (type === 'scan-directory') {
    try {
      const result = await scanDirectory(data, (progress) => {
        // Send progress updates to main thread
        parentPort.postMessage({
          taskId,
          type: MESSAGE_TYPES.PROGRESS,
          progress,
        });
      });

      parentPort.postMessage({
        taskId,
        type: MESSAGE_TYPES.SUCCESS,
        result,
      });
    } catch (error) {
      parentPort.postMessage({
        taskId,
        type: MESSAGE_TYPES.ERROR,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
      });
    }
  }
});

// Signal that worker is ready
parentPort.postMessage({ type: MESSAGE_TYPES.READY });
