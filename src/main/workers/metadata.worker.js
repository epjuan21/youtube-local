// src/main/workers/metadata.worker.js
// Worker thread for video metadata extraction using FFmpeg

const { parentPort } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const { MESSAGE_TYPES } = require('./workerTypes');

// Configure FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extract metadata from video file
 * @param {Object} data - Task data
 * @returns {Promise<Object>} Metadata object
 */
async function extractMetadata(data) {
  const { videoPath } = data;

  return new Promise((resolve, reject) => {
    // Verify video file exists
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video not found: ${videoPath}`));
      return;
    }

    const startTime = Date.now();

    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe failed: ${err.message}`));
        return;
      }

      try {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        const result = {
          duration: Math.floor(metadata.format.duration || 0),
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          videoCodec: videoStream?.codec_name,
          width: videoStream?.width,
          height: videoStream?.height,
          fps: videoStream?.r_frame_rate,
          audioCodec: audioStream?.codec_name,
          audioChannels: audioStream?.channels,
          resolution: videoStream?.width && videoStream?.height
            ? `${videoStream.width}x${videoStream.height}`
            : null,
          extractionTime: Date.now() - startTime,
        };

        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Failed to parse metadata: ${parseErr.message}`));
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

  // Handle metadata extraction task
  if (type === 'extract-metadata') {
    try {
      const result = await extractMetadata(data);

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
