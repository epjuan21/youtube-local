// src/main/workers/TaskQueue.js
// Priority task queue with persistence support

const fs = require('fs');
const path = require('path');
const { PRIORITIES, TASK_STATUS } = require('./workerTypes');

class TaskQueue {
  constructor(config) {
    // Priority queues (one per priority level)
    this.queues = new Map([
      [PRIORITIES.CRITICAL, []],
      [PRIORITIES.HIGH, []],
      [PRIORITIES.NORMAL, []],
      [PRIORITIES.LOW, []],
    ]);

    // Task metadata map (taskId → task)
    this.taskMap = new Map();

    // Configuration
    this.persistencePath = config.persistencePath;
    this.saveInterval = config.saveInterval;
    this.maxSize = config.maxSize;

    // Persistence timer
    this.saveIntervalId = null;

    // Setup persistence and restore
    this._setupPersistence();
  }

  /**
   * Add task to queue
   * @param {Object} task - Task object
   * @param {number} priority - Priority level (PRIORITIES constant)
   * @returns {string} taskId
   */
  enqueue(task, priority = PRIORITIES.NORMAL) {
    if (this.size() >= this.maxSize) {
      throw new Error(`Queue is full (max: ${this.maxSize})`);
    }

    const taskId = this._generateTaskId();
    const queuedTask = {
      id: taskId,
      type: task.type,
      data: task.data,
      priority,
      status: TASK_STATUS.QUEUED,
      enqueuedAt: Date.now(),
      attempts: 0,
      maxAttempts: task.maxAttempts || 3,
    };

    this.queues.get(priority).push(queuedTask);
    this.taskMap.set(taskId, queuedTask);

    return taskId;
  }

  /**
   * Dequeue highest priority task
   * @returns {Object|null} task or null if queue is empty
   */
  dequeue() {
    // Check queues in priority order (CRITICAL → LOW)
    for (const priority of [PRIORITIES.CRITICAL, PRIORITIES.HIGH, PRIORITIES.NORMAL, PRIORITIES.LOW]) {
      const queue = this.queues.get(priority);
      if (queue.length > 0) {
        const task = queue.shift();
        task.status = TASK_STATUS.RUNNING;
        task.dequeuedAt = Date.now();
        return task;
      }
    }

    return null;
  }

  /**
   * Cancel specific task by ID
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} true if cancelled, false if not found
   */
  cancel(taskId) {
    const task = this.taskMap.get(taskId);
    if (!task) return false;

    // Only cancel if still queued
    if (task.status !== TASK_STATUS.QUEUED) {
      return false;
    }

    const queue = this.queues.get(task.priority);
    const index = queue.findIndex(t => t.id === taskId);

    if (index !== -1) {
      queue.splice(index, 1);
      task.status = TASK_STATUS.CANCELLED;
      this.taskMap.delete(taskId);
      return true;
    }

    return false;
  }

  /**
   * Cancel all tasks of a specific type
   * @param {string} type - Task type (e.g., 'thumbnail', 'scanner')
   * @returns {number} Number of tasks cancelled
   */
  cancelByType(type) {
    let cancelled = 0;

    for (const [priority, queue] of this.queues) {
      const before = queue.length;
      const remaining = queue.filter(task => {
        if (task.type === type && task.status === TASK_STATUS.QUEUED) {
          task.status = TASK_STATUS.CANCELLED;
          this.taskMap.delete(task.id);
          return false; // Remove from queue
        }
        return true; // Keep in queue
      });

      this.queues.set(priority, remaining);
      cancelled += before - remaining.length;
    }

    return cancelled;
  }

  /**
   * Mark task as completed
   * @param {string} taskId - Task ID
   */
  complete(taskId) {
    const task = this.taskMap.get(taskId);
    if (task) {
      task.status = TASK_STATUS.COMPLETED;
      task.completedAt = Date.now();
      this.taskMap.delete(taskId);
    }
  }

  /**
   * Mark task as failed and optionally retry
   * @param {string} taskId - Task ID
   * @param {Error} error - Error object
   * @returns {Object} { shouldRetry: boolean, attempts?: number }
   */
  fail(taskId, error) {
    const task = this.taskMap.get(taskId);
    if (!task) {
      return { shouldRetry: false, reason: 'Task not found' };
    }

    task.attempts++;
    task.lastError = error.message;
    task.lastErrorAt = Date.now();

    if (task.attempts >= task.maxAttempts) {
      task.status = TASK_STATUS.FAILED;
      this.taskMap.delete(taskId);
      return { shouldRetry: false, reason: 'Max attempts reached' };
    }

    // Re-enqueue with lower priority (exponential backoff via priority)
    const newPriority = Math.min(task.priority + 1, PRIORITIES.LOW);
    task.priority = newPriority;
    task.status = TASK_STATUS.QUEUED;

    this.queues.get(newPriority).push(task);

    return { shouldRetry: true, attempts: task.attempts };
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Object|null} Task or null
   */
  getTask(taskId) {
    return this.taskMap.get(taskId) || null;
  }

  /**
   * Get queue statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      total: this.size(),
      byPriority: {
        critical: this.queues.get(PRIORITIES.CRITICAL).length,
        high: this.queues.get(PRIORITIES.HIGH).length,
        normal: this.queues.get(PRIORITIES.NORMAL).length,
        low: this.queues.get(PRIORITIES.LOW).length,
      },
      oldestTask: this._getOldestTask(),
    };
  }

  /**
   * Get total number of queued tasks
   * @returns {number} Total tasks
   */
  size() {
    return this.taskMap.size;
  }

  /**
   * Clear all tasks from queue
   */
  clear() {
    this.queues.forEach(queue => queue.length = 0);
    this.taskMap.clear();
  }

  /**
   * Cleanup and destroy queue
   */
  destroy() {
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
    this._persist(); // Final save
    this.clear();
  }

  // Private methods

  _setupPersistence() {
    if (this.saveInterval && this.persistencePath) {
      // Periodic save
      this.saveIntervalId = setInterval(() => {
        this._persist();
      }, this.saveInterval);
    }

    // Restore from disk
    this._restore();
  }

  _persist() {
    if (!this.persistencePath) return;

    try {
      // Ensure directory exists
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const state = {
        timestamp: Date.now(),
        queues: Array.from(this.queues.entries()).map(([priority, tasks]) => ({
          priority,
          tasks: tasks.map(t => ({ ...t })), // Clone tasks
        })),
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Failed to persist queue:', error.message);
    }
  }

  _restore() {
    if (!this.persistencePath || !fs.existsSync(this.persistencePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.persistencePath, 'utf-8');
      const state = JSON.parse(data);

      // Restore queues
      for (const { priority, tasks } of state.queues) {
        this.queues.set(priority, tasks);
        tasks.forEach(task => this.taskMap.set(task.id, task));
      }

      console.log(`📥 Restored ${this.size()} tasks from persistence`);
    } catch (error) {
      console.error('❌ Failed to restore queue:', error.message);
    }
  }

  _generateTaskId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _getOldestTask() {
    let oldest = null;

    for (const queue of this.queues.values()) {
      if (queue.length > 0) {
        const first = queue[0];
        if (!oldest || first.enqueuedAt < oldest.enqueuedAt) {
          oldest = first;
        }
      }
    }

    return oldest;
  }
}

module.exports = { TaskQueue };
