class ValidationQueue {
  constructor({ concurrency, maxQueueSize }) {
    this.concurrency = Math.max(1, Math.floor(concurrency));
    this.maxQueueSize = Math.max(1, Math.floor(maxQueueSize));
    this.running = 0;
    this.pending = [];
  }

  enqueue(task) {
    if (typeof task !== "function") {
      throw new TypeError("Task must be a function.");
    }

    if (this.pending.length >= this.maxQueueSize) {
      const error = new Error("Servidor ocupado. Tente novamente em alguns minutos.");
      error.code = "QUEUE_FULL";
      throw error;
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ task, resolve, reject });
      this.drain();
    });
  }

  getMetrics() {
    return {
      concurrency: this.concurrency,
      maxQueueSize: this.maxQueueSize,
      running: this.running,
      queued: this.pending.length
    };
  }

  drain() {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const next = this.pending.shift();
      this.running += 1;

      Promise.resolve()
        .then(() => next.task())
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          this.running -= 1;
          this.drain();
        });
    }
  }
}

module.exports = {
  ValidationQueue
};
