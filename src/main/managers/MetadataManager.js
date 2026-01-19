// src/main/managers/MetadataManager.js
// Manager for metadata extraction using worker pool

const { WorkerPool } = require('../workers/WorkerPool');
const { PRIORITIES } = require('../workers/workerTypes');

class MetadataManager {
  constructor(config) {
    this.config = config;
    this.workerPool = null;
    this.initialized = false;
  }

  /**
   * Initialize the metadata manager
   */
  async initialize() {
    if (this.initialized) return;

    this.workerPool = new WorkerPool(
      this.config.workerScript,
      this.config
    );

    await this.workerPool.initialize();
    this.initialized = true;

    console.log('✅ MetadataManager initialized');
  }

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Extract metadata for a single video
   * @param {number} videoId - Video database ID
   * @param {string} videoPath - Full path to video file
   * @param {number} priority - Task priority (default: NORMAL)
   * @returns {Promise<Object>} Metadata object
   */
  async extractMetadata(videoId, videoPath, priority = PRIORITIES.NORMAL) {
    if (!this.initialized) {
      throw new Error('MetadataManager not initialized');
    }

    const task = {
      id: `metadata-${videoId}-${Date.now()}`,
      type: 'extract-metadata',
      data: {
        videoPath,
      },
      priority,
    };

    try {
      const metadata = await this.workerPool.executeTask(task);
      return {
        success: true,
        videoId,
        metadata,
      };
    } catch (error) {
      console.error(`Error extracting metadata for ${videoPath}:`, error.message);
      return {
        success: false,
        videoId,
        error: error.message,
      };
    }
  }

  /**
   * Extract metadata for multiple videos concurrently
   * @param {Array} videos - Array of {id, filepath} objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Results summary
   */
  async extractBatch(videos, onProgress = null) {
    if (!this.initialized) {
      throw new Error('MetadataManager not initialized');
    }

    const total = videos.length;
    let processed = 0;
    let failed = 0;
    const errors = [];

    // Process videos concurrently using Promise.allSettled
    // This allows the worker pool to handle concurrency naturally
    const promises = videos.map(async (video, index) => {
      try {
        const result = await this.extractMetadata(
          video.id,
          video.filepath,
          PRIORITIES.NORMAL
        );

        if (result.success) {
          processed++;
        } else {
          failed++;
          errors.push({
            videoId: video.id,
            filename: video.filename,
            error: result.error,
          });
        }

        // Report progress
        if (onProgress) {
          onProgress({
            current: index + 1,
            total,
            filename: video.filename,
            progress: Math.round(((index + 1) / total) * 100),
            success: result.success,
          });
        }

        return result;
      } catch (error) {
        failed++;
        errors.push({
          videoId: video.id,
          filename: video.filename,
          error: error.message,
        });

        if (onProgress) {
          onProgress({
            current: index + 1,
            total,
            filename: video.filename,
            progress: Math.round(((index + 1) / total) * 100),
            success: false,
            error: error.message,
          });
        }

        return {
          success: false,
          videoId: video.id,
          error: error.message,
        };
      }
    });

    // Wait for all metadata extractions to complete
    const results = await Promise.allSettled(promises);

    return {
      success: true,
      processed,
      failed,
      errors,
      results: results.map(r => r.status === 'fulfilled' ? r.value : null),
    };
  }

  /**
   * Cancel all pending metadata tasks
   * Note: This only prevents new tasks from starting
   */
  cancelAll() {
    // Note: Current implementation doesn't support mid-task cancellation
    console.log('⚠️  Metadata cancellation requested but not yet implemented');
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
      console.log('✅ MetadataManager shut down');
    }
  }
}

module.exports = { MetadataManager };
