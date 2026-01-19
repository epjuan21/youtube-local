// src/main/workers/thumbnail.worker.js
// Worker thread for thumbnail generation using FFmpeg

const { parentPort } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const { MESSAGE_TYPES } = require('./workerTypes');

// Configure FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Generate thumbnail for a video
 * @param {Object} data - Task data
 * @returns {Promise<Object>} Result with thumbnail path
 */
async function generateThumbnail(data) {
  const { videoPath, outputPath, timestamp = '5', size = '640x360' } = data;

  return new Promise((resolve, reject) => {
    // Check if thumbnail already exists
    if (fs.existsSync(outputPath)) {
      resolve({ outputPath, cached: true });
      return;
    }

    // Verify video file exists
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video not found: ${videoPath}`));
      return;
    }

    const startTime = Date.now();

    // Generate thumbnail at specified timestamp
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size,
      })
      .on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          outputPath,
          cached: false,
          duration,
        });
      })
      .on('error', (err) => {
        // Retry with first frame if initial timestamp fails
        if (timestamp !== '00:00:01') {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: ['00:00:01'],
              filename: path.basename(outputPath),
              folder: path.dirname(outputPath),
              size,
            })
            .on('end', () => {
              const duration = Date.now() - startTime;
              resolve({
                outputPath,
                cached: false,
                fallback: true,
                duration,
              });
            })
            .on('error', (retryErr) => {
              reject(new Error(`Thumbnail generation failed: ${retryErr.message}`));
            });
        } else {
          reject(new Error(`Thumbnail generation failed: ${err.message}`));
        }
      });
  });
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

  // Handle thumbnail generation task
  if (type === 'generate-thumbnail') {
    try {
      const result = await generateThumbnail(data);

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
