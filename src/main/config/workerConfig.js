// src/main/config/workerConfig.js
// Configuration for worker thread pools

const os = require('os');
const path = require('path');

const CPU_CORES = os.cpus().length;

module.exports = {
  // Worker pool configurations
  pools: {
    thumbnail: {
      minWorkers: 1,
      maxWorkers: Math.max(2, Math.floor(CPU_CORES * 0.4)), // 40% of cores
      idleTimeout: 120000, // 2 minutes
      taskTimeout: 30000,  // 30 seconds per thumbnail
      workerScript: path.join(__dirname, '../workers/thumbnail.worker.js'),
    },
    scanner: {
      minWorkers: 1,
      maxWorkers: Math.max(2, Math.floor(CPU_CORES * 0.3)), // 30% of cores
      idleTimeout: 180000, // 3 minutes
      taskTimeout: 0,      // No timeout for scanning (can be long)
      workerScript: path.join(__dirname, '../workers/scanner.worker.js'),
    },
    metadata: {
      minWorkers: 1,
      maxWorkers: Math.max(2, Math.floor(CPU_CORES * 0.3)), // 30% of cores
      idleTimeout: 120000, // 2 minutes
      taskTimeout: 15000,  // 15 seconds per video
      workerScript: path.join(__dirname, '../workers/metadata.worker.js'),
    },
  },

  // Task queue configuration
  queue: {
    maxSize: 10000, // Maximum tasks in queue
    // persistencePath will be set when app is ready
    persistencePath: null,
    getPersistencePath: () => {
      // Get app dynamically to avoid loading it at module level
      const { app } = require('electron');
      if (!app || !app.isReady()) {
        return path.join(process.cwd(), 'database/worker-queue.json');
      }
      return path.join(app.getPath('userData'), 'database/worker-queue.json');
    },
    saveInterval: 5000, // Save queue every 5 seconds
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,     // 1 second
    maxDelay: 10000,        // 10 seconds max
    backoffMultiplier: 2,   // Exponential backoff
  },

  // Progress reporting
  progress: {
    batchSize: 10,     // Report every 10 tasks
    throttleMs: 500,   // Max 2 updates per second
  },
};
