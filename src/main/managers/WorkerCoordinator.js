// src/main/managers/WorkerCoordinator.js
// Central coordinator for all worker pools and managers

const { ThumbnailManager } = require('./ThumbnailManager');
const { ScanManager } = require('./ScanManager');
const { MetadataManager } = require('./MetadataManager');
const { TaskQueue } = require('../workers/TaskQueue');
const { WORKER_TYPES } = require('../workers/workerTypes');

class WorkerCoordinator {
  constructor(config, mainWindow = null) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.initialized = false;

    // Managers
    this.thumbnailManager = null;
    this.scanManager = null;
    this.metadataManager = null;

    // Task queue (shared across all managers for priority handling)
    this.taskQueue = null;

    // Statistics
    this.stats = {
      thumbnail: { total: 0, completed: 0, failed: 0 },
      scanner: { total: 0, completed: 0, failed: 0 },
      metadata: { total: 0, completed: 0, failed: 0 },
    };
  }

  /**
   * Initialize all worker pools and managers
   */
  async initialize() {
    if (this.initialized) {
      console.log('⚠️  WorkerCoordinator already initialized');
      return;
    }

    console.log('🚀 Initializing worker coordinator...');

    try {
      // Initialize task queue with proper persistence path
      const queueConfig = {
        ...this.config.queue,
        persistencePath: this.config.queue.getPersistencePath
          ? this.config.queue.getPersistencePath()
          : this.config.queue.persistencePath
      };
      this.taskQueue = new TaskQueue(queueConfig);

      // Initialize thumbnail manager
      this.thumbnailManager = new ThumbnailManager(this.config.pools.thumbnail);
      await this.thumbnailManager.initialize();

      // Initialize scan manager
      this.scanManager = new ScanManager(this.config.pools.scanner);
      await this.scanManager.initialize();

      // Initialize metadata manager
      this.metadataManager = new MetadataManager(this.config.pools.metadata);
      await this.metadataManager.initialize();

      this.initialized = true;

      console.log('✅ WorkerCoordinator initialized successfully');
      console.log(`   • Thumbnail workers: ${this.thumbnailManager.getStatus().total}`);
      console.log(`   • Scanner workers: ${this.scanManager.getStatus().total}`);
      console.log(`   • Metadata workers: ${this.metadataManager.getStatus().total}`);
    } catch (error) {
      console.error('❌ Failed to initialize WorkerCoordinator:', error.message);
      throw error;
    }
  }

  /**
   * Check if coordinator is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get thumbnail manager
   * @returns {ThumbnailManager}
   */
  getThumbnailManager() {
    if (!this.initialized) {
      throw new Error('WorkerCoordinator not initialized');
    }
    return this.thumbnailManager;
  }

  /**
   * Get scan manager
   * @returns {ScanManager}
   */
  getScanManager() {
    if (!this.initialized) {
      throw new Error('WorkerCoordinator not initialized');
    }
    return this.scanManager;
  }

  /**
   * Get metadata manager
   * @returns {MetadataManager}
   */
  getMetadataManager() {
    if (!this.initialized) {
      throw new Error('WorkerCoordinator not initialized');
    }
    return this.metadataManager;
  }

  /**
   * Get overall status of all worker pools
   * @returns {Object} Status object
   */
  getStatus() {
    if (!this.initialized) {
      return {
        initialized: false,
        message: 'WorkerCoordinator not initialized',
      };
    }

    return {
      initialized: true,
      pools: {
        thumbnail: this.thumbnailManager.getStatus(),
        scanner: this.scanManager.getStatus(),
        metadata: this.metadataManager.getStatus(),
      },
      queue: this.taskQueue.getStats(),
      statistics: { ...this.stats },
    };
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue stats
   */
  getQueueStats() {
    if (!this.taskQueue) {
      return { total: 0 };
    }
    return this.taskQueue.getStats();
  }

  /**
   * Cancel a specific task (not yet implemented in workers)
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} True if cancelled
   */
  cancelTask(taskId) {
    if (!this.taskQueue) return false;
    return this.taskQueue.cancel(taskId);
  }

  /**
   * Cancel all tasks of a specific type
   * @param {string} taskType - Task type (thumbnail, scanner, metadata)
   * @returns {number} Number of tasks cancelled
   */
  cancelByType(taskType) {
    if (!this.taskQueue) return 0;

    // Map task type to worker type
    const workerType = taskType === 'thumbnail' ? WORKER_TYPES.THUMBNAIL
      : taskType === 'scanner' ? WORKER_TYPES.SCANNER
      : taskType === 'metadata' ? WORKER_TYPES.METADATA
      : null;

    if (!workerType) {
      console.error(`Unknown task type: ${taskType}`);
      return 0;
    }

    return this.taskQueue.cancelByType(workerType);
  }

  /**
   * Pause all worker pools (not yet implemented)
   */
  pause() {
    console.log('⚠️  Worker pause not yet implemented');
    return { paused: false };
  }

  /**
   * Resume all worker pools (not yet implemented)
   */
  resume() {
    console.log('⚠️  Worker resume not yet implemented');
    return { resumed: false };
  }

  /**
   * Update statistics for a specific manager
   * @param {string} type - Manager type
   * @param {string} event - Event type (completed, failed)
   */
  updateStats(type, event) {
    if (this.stats[type]) {
      this.stats[type].total++;
      if (event === 'completed') {
        this.stats[type].completed++;
      } else if (event === 'failed') {
        this.stats[type].failed++;
      }
    }
  }

  /**
   * Emit progress event to renderer
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  emitProgress(eventName, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(eventName, data);
    }
  }

  /**
   * Gracefully shutdown all worker pools
   */
  async shutdown() {
    if (!this.initialized) {
      console.log('⚠️  WorkerCoordinator not initialized, nothing to shutdown');
      return;
    }

    console.log('🛑 Shutting down WorkerCoordinator...');

    try {
      // Shutdown all managers in parallel
      await Promise.all([
        this.thumbnailManager.shutdown(),
        this.scanManager.shutdown(),
        this.metadataManager.shutdown(),
      ]);

      // Cleanup task queue
      if (this.taskQueue) {
        this.taskQueue.destroy();
        this.taskQueue = null;
      }

      this.initialized = false;

      console.log('✅ WorkerCoordinator shut down successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      throw error;
    }
  }
}

module.exports = { WorkerCoordinator };
