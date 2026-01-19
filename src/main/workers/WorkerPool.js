// src/main/workers/WorkerPool.js
// Generic worker pool manager for handling worker threads

const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const { MESSAGE_TYPES } = require('./workerTypes');

class WorkerPool extends EventEmitter {
  constructor(workerScript, config) {
    super();

    this.workerScript = workerScript;
    this.minWorkers = config.minWorkers || 1;
    this.maxWorkers = config.maxWorkers || 4;
    this.idleTimeout = config.idleTimeout || 120000; // 2 minutes
    this.taskTimeout = config.taskTimeout || 30000;  // 30 seconds

    // Worker tracking
    this.workers = new Map(); // worker → metadata
    this.availableWorkers = [];
    this.activeTasks = new Map(); // taskId → worker
    this.nextWorkerId = 1;

    // Pool state
    this.isShuttingDown = false;
  }

  /**
   * Initialize the worker pool
   */
  async initialize() {
    // Spawn minimum number of workers
    for (let i = 0; i < this.minWorkers; i++) {
      await this._spawnWorker();
    }

    console.log(`✅ Worker pool initialized (${this.workers.size}/${this.maxWorkers} workers)`);
  }

  /**
   * Execute a task on an available worker
   * @param {Object} task - Task object with { id, type, data }
   * @returns {Promise} Resolves with task result
   */
  async executeTask(task) {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    const worker = await this._getAvailableWorker();
    const { id: taskId, type, data } = task;

    return new Promise((resolve, reject) => {
      const timeout = this.taskTimeout > 0
        ? setTimeout(() => {
            reject(new Error(`Task ${taskId} timed out after ${this.taskTimeout}ms`));
            this._handleWorkerError(worker, new Error('Task timeout'));
          }, this.taskTimeout)
        : null;

      // Setup message handler for this task
      const messageHandler = (message) => {
        if (message.taskId !== taskId) return;

        if (message.type === MESSAGE_TYPES.SUCCESS) {
          if (timeout) clearTimeout(timeout);
          worker.removeListener('message', messageHandler);
          this._markWorkerAvailable(worker);
          this.activeTasks.delete(taskId);
          resolve(message.result);
        } else if (message.type === MESSAGE_TYPES.ERROR) {
          if (timeout) clearTimeout(timeout);
          worker.removeListener('message', messageHandler);
          this._markWorkerAvailable(worker);
          this.activeTasks.delete(taskId);
          reject(new Error(message.error.message || 'Worker task failed'));
        } else if (message.type === MESSAGE_TYPES.PROGRESS) {
          // Emit progress event
          this.emit('task-progress', { taskId, progress: message.progress });
        }
      };

      worker.on('message', messageHandler);

      // Mark worker as busy
      const workerMeta = this.workers.get(worker);
      workerMeta.isBusy = true;
      workerMeta.currentTask = taskId;
      this.activeTasks.set(taskId, worker);

      // Send task to worker
      worker.postMessage({
        taskId,
        type,
        data,
      });
    });
  }

  /**
   * Get or spawn an available worker
   * @returns {Promise<Worker>} Available worker
   */
  async _getAvailableWorker() {
    // Check for available workers
    if (this.availableWorkers.length > 0) {
      return this.availableWorkers.pop();
    }

    // Spawn new worker if under max limit
    if (this.workers.size < this.maxWorkers) {
      return await this._spawnWorker();
    }

    // Wait for a worker to become available
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.availableWorkers.length > 0) {
          resolve(this.availableWorkers.pop());
        } else {
          setTimeout(checkAvailable, 100);
        }
      };
      checkAvailable();
    });
  }

  /**
   * Spawn a new worker
   * @returns {Promise<Worker>} New worker instance
   */
  async _spawnWorker() {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerScript);
      const workerId = this.nextWorkerId++;

      const workerMeta = {
        id: workerId,
        worker,
        isBusy: false,
        currentTask: null,
        spawnedAt: Date.now(),
        taskCount: 0,
        idleTimer: null,
        restartCount: 0,
      };

      // Setup worker event handlers
      worker.on('message', (message) => {
        if (message.type === MESSAGE_TYPES.READY) {
          this.workers.set(worker, workerMeta);
          this.availableWorkers.push(worker);
          console.log(`🔧 Worker ${workerId} ready`);
          resolve(worker);
        }
      });

      worker.on('error', (error) => {
        console.error(`❌ Worker ${workerId} error:`, error.message);
        this._handleWorkerError(worker, error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ Worker ${workerId} exited with code ${code}`);
          this._handleWorkerExit(worker, code);
        }
      });
    });
  }

  /**
   * Mark worker as available
   * @param {Worker} worker - Worker to mark available
   */
  _markWorkerAvailable(worker) {
    const workerMeta = this.workers.get(worker);
    if (!workerMeta) return;

    workerMeta.isBusy = false;
    workerMeta.currentTask = null;
    workerMeta.taskCount++;
    this.availableWorkers.push(worker);

    // Start idle timer if enabled
    if (this.idleTimeout > 0 && this.workers.size > this.minWorkers) {
      workerMeta.idleTimer = setTimeout(() => {
        this._terminateIdleWorker(worker);
      }, this.idleTimeout);
    }
  }

  /**
   * Handle worker error
   * @param {Worker} worker - Worker that errored
   * @param {Error} error - Error object
   */
  _handleWorkerError(worker, error) {
    const workerMeta = this.workers.get(worker);
    if (!workerMeta) return;

    const taskId = workerMeta.currentTask;
    if (taskId) {
      this.emit('task-error', { taskId, error });
      this.activeTasks.delete(taskId);
    }

    // Terminate and restart worker
    this._terminateWorker(worker);

    // Respawn if under min workers and not shutting down
    if (!this.isShuttingDown && this.workers.size < this.minWorkers) {
      this._spawnWorker();
    }
  }

  /**
   * Handle worker exit
   * @param {Worker} worker - Worker that exited
   * @param {number} code - Exit code
   */
  _handleWorkerExit(worker, code) {
    const workerMeta = this.workers.get(worker);
    if (!workerMeta) return;

    // Remove from tracking
    this.workers.delete(worker);
    const index = this.availableWorkers.indexOf(worker);
    if (index !== -1) {
      this.availableWorkers.splice(index, 1);
    }

    // Respawn if needed
    if (!this.isShuttingDown && this.workers.size < this.minWorkers && workerMeta.restartCount < 3) {
      console.log(`🔄 Restarting worker ${workerMeta.id}...`);
      this._spawnWorker();
    }
  }

  /**
   * Terminate an idle worker
   * @param {Worker} worker - Worker to terminate
   */
  _terminateIdleWorker(worker) {
    const workerMeta = this.workers.get(worker);
    if (!workerMeta || workerMeta.isBusy) return;

    console.log(`🗑️  Terminating idle worker ${workerMeta.id}`);
    this._terminateWorker(worker);
  }

  /**
   * Terminate a worker
   * @param {Worker} worker - Worker to terminate
   */
  _terminateWorker(worker) {
    const workerMeta = this.workers.get(worker);
    if (workerMeta && workerMeta.idleTimer) {
      clearTimeout(workerMeta.idleTimer);
    }

    this.workers.delete(worker);
    const index = this.availableWorkers.indexOf(worker);
    if (index !== -1) {
      this.availableWorkers.splice(index, 1);
    }

    worker.terminate();
  }

  /**
   * Get pool status
   * @returns {Object} Pool status
   */
  getStatus() {
    return {
      total: this.workers.size,
      active: this.activeTasks.size,
      idle: this.availableWorkers.length,
      min: this.minWorkers,
      max: this.maxWorkers,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Gracefully shutdown the worker pool
   * @param {Object} options - Shutdown options
   * @returns {Promise}
   */
  async shutdown(options = {}) {
    const { timeout = 10000 } = options;
    this.isShuttingDown = true;

    console.log(`🛑 Shutting down worker pool (${this.workers.size} workers)...`);

    // Send shutdown message to all workers
    const shutdownPromises = Array.from(this.workers.keys()).map(worker => {
      return new Promise((resolve) => {
        const shutdownTimeout = setTimeout(() => {
          console.log('⚠️  Worker shutdown timeout, forcing termination');
          resolve();
        }, timeout);

        worker.once('message', (message) => {
          if (message.type === MESSAGE_TYPES.SHUTDOWN_ACK) {
            clearTimeout(shutdownTimeout);
            resolve();
          }
        });

        worker.postMessage({ type: MESSAGE_TYPES.SHUTDOWN });
      });
    });

    // Wait for all workers to acknowledge shutdown or timeout
    await Promise.all(shutdownPromises);

    // Force terminate any remaining workers
    for (const worker of this.workers.keys()) {
      this._terminateWorker(worker);
    }

    this.workers.clear();
    this.availableWorkers = [];
    this.activeTasks.clear();

    console.log('✅ Worker pool shut down');
  }
}

module.exports = { WorkerPool };
