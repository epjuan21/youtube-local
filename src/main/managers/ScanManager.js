// src/main/managers/ScanManager.js
// Manager for file system scanning using worker pool

const { WorkerPool } = require('../workers/WorkerPool');
const { PRIORITIES } = require('../workers/workerTypes');

class ScanManager {
  constructor(config) {
    this.config = config;
    this.workerPool = null;
    this.initialized = false;
    this.activeScan = null;
  }

  /**
   * Initialize the scan manager
   */
  async initialize() {
    if (this.initialized) return;

    this.workerPool = new WorkerPool(
      this.config.workerScript,
      this.config
    );

    // Setup progress listener
    this.workerPool.on('task-progress', ({ taskId, progress }) => {
      if (this.activeScan && this.activeScan.taskId === taskId) {
        if (this.activeScan.onProgress) {
          this.activeScan.onProgress({
            type: 'scanning',
            ...progress,
          });
        }
      }
    });

    await this.workerPool.initialize();
    this.initialized = true;

    console.log('✅ ScanManager initialized');
  }

  /**
   * Check if manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Scan directory for video files
   * @param {string} directoryPath - Directory to scan
   * @param {string} diskIdentifier - Disk UUID
   * @param {string} mountPoint - Mount point path
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Array of video file objects
   */
  async scanDirectory(directoryPath, diskIdentifier, mountPoint, onProgress = null) {
    if (!this.initialized) {
      throw new Error('ScanManager not initialized');
    }

    const taskId = `scan-${Date.now()}`;

    const task = {
      id: taskId,
      type: 'scan-directory',
      data: {
        directoryPath,
        recursive: true,
      },
      priority: PRIORITIES.HIGH, // Scans are usually user-initiated
    };

    // Store active scan info for progress tracking
    this.activeScan = {
      taskId,
      onProgress,
      directoryPath,
    };

    try {
      const result = await this.workerPool.executeTask(task);

      // Add diskIdentifier and mountPoint to each video
      const videos = result.videos.map(video => ({
        ...video,
        diskIdentifier,
        mountPoint,
      }));

      this.activeScan = null;

      return videos;
    } catch (error) {
      this.activeScan = null;
      console.error(`Error scanning directory ${directoryPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel active scan
   * @returns {boolean} True if scan was cancelled
   */
  cancelScan() {
    if (this.activeScan) {
      // Note: Current implementation doesn't support mid-task cancellation
      // This would require implementing cancellation tokens in workers
      console.log('⚠️  Scan cancellation requested but not yet implemented');
      this.activeScan = null;
      return true;
    }
    return false;
  }

  /**
   * Get current scan progress
   * @returns {Object|null} Progress info or null
   */
  getProgress() {
    if (this.activeScan) {
      return {
        directoryPath: this.activeScan.directoryPath,
        taskId: this.activeScan.taskId,
      };
    }
    return null;
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
      scanning: this.activeScan !== null,
      ...this.workerPool.getStatus(),
    };
  }

  /**
   * Shutdown the manager
   */
  async shutdown() {
    if (this.workerPool) {
      this.activeScan = null;
      await this.workerPool.shutdown();
      this.initialized = false;
      console.log('✅ ScanManager shut down');
    }
  }
}

module.exports = { ScanManager };
