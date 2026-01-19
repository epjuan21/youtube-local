// src/main/managers/ThumbnailManager.js
// Manager for thumbnail generation using worker pool

const path = require('path');
const fs = require('fs');
const { WorkerPool } = require('../workers/WorkerPool');
const { PRIORITIES } = require('../workers/workerTypes');

class ThumbnailManager {
  constructor(config) {
    this.config = config;
    this.workerPool = null;
    this.thumbnailsDir = null; // Se inicializa en initialize()
    this.initialized = false;
  }

  _getThumbnailsDir() {
    if (!this.thumbnailsDir) {
      // Get app dynamically to avoid loading it at module level
      const { app } = require('electron');
      this.thumbnailsDir = path.join(app.getPath('userData'), 'thumbnails');
      if (!fs.existsSync(this.thumbnailsDir)) {
        fs.mkdirSync(this.thumbnailsDir, { recursive: true });
      }
    }
    return this.thumbnailsDir;
  }

  /**
   * Initialize the thumbnail manager
   */
  async initialize() {
    if (this.initialized) return;

    this.workerPool = new WorkerPool(
      this.config.workerScript,
      this.config
    );

    await this.workerPool.initialize();
    this.initialized = true;

    console.log('✅ ThumbnailManager initialized');
  }

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Generate thumbnail for a single video
   * @param {string} videoPath - Full path to video file
   * @param {string} videoHash - Hash identifier for the video
   * @param {number} priority - Task priority (default: NORMAL)
   * @returns {Promise<string>} Path to generated thumbnail
   */
  async generateThumbnail(videoPath, videoHash, priority = PRIORITIES.NORMAL) {
    if (!this.initialized) {
      throw new Error('ThumbnailManager not initialized');
    }

    const thumbnailFilename = `${videoHash}.jpg`;
    const outputPath = path.join(this._getThumbnailsDir(), thumbnailFilename);

    const task = {
      id: `thumb-${videoHash}-${Date.now()}`,
      type: 'generate-thumbnail',
      data: {
        videoPath,
        outputPath,
        timestamp: '5',
        size: '640x360',
      },
      priority,
    };

    try {
      const result = await this.workerPool.executeTask(task);
      return result.outputPath;
    } catch (error) {
      console.error(`Error generating thumbnail for ${videoPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate thumbnails for multiple videos
   * @param {Array} videos - Array of {videoPath, videoHash} objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Array of results
   */
  async generateBatch(videos, onProgress = null) {
    if (!this.initialized) {
      throw new Error('ThumbnailManager not initialized');
    }

    const results = [];
    const total = videos.length;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      try {
        const thumbnailPath = await this.generateThumbnail(
          video.videoPath,
          video.videoHash,
          PRIORITIES.NORMAL
        );

        results.push({
          success: true,
          thumbnailPath,
          videoHash: video.videoHash,
        });

        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            videoPath: video.videoPath,
            success: true,
          });
        }
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          videoHash: video.videoHash,
        });

        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            videoPath: video.videoPath,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get pool status
   * @returns {Object} Status object
   */
  getStatus() {
    if (!this.workerPool) {
      return { initialized: false };
    }

    return {
      initialized: this.initialized,
      ...this.workerPool.getStatus(),
    };
  }

  /**
   * Shutdown the manager
   */
  async shutdown() {
    if (this.workerPool) {
      await this.workerPool.shutdown();
      this.initialized = false;
      console.log('✅ ThumbnailManager shut down');
    }
  }
}

module.exports = { ThumbnailManager };
