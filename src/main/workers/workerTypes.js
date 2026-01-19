// src/main/workers/workerTypes.js
// Worker type constants and task priority levels

/**
 * Worker types
 */
const WORKER_TYPES = {
  THUMBNAIL: 'thumbnail',
  SCANNER: 'scanner',
  METADATA: 'metadata',
};

/**
 * Task priority levels
 */
const PRIORITIES = {
  CRITICAL: 0,  // User-initiated actions (single video thumbnail)
  HIGH: 1,      // Visible viewport (lazy loading)
  NORMAL: 2,    // Background batch processing
  LOW: 3,       // Prefetching, non-essential
};

/**
 * Task status
 */
const TASK_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Worker message types
 */
const MESSAGE_TYPES = {
  // Main → Worker
  TASK: 'task',
  SHUTDOWN: 'shutdown',
  PING: 'ping',

  // Worker → Main
  READY: 'ready',
  SUCCESS: 'success',
  ERROR: 'error',
  PROGRESS: 'progress',
  SHUTDOWN_ACK: 'shutdown-ack',
  PONG: 'pong',
};

module.exports = {
  WORKER_TYPES,
  PRIORITIES,
  TASK_STATUS,
  MESSAGE_TYPES,
};
