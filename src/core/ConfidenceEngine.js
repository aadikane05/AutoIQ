class ConfidenceEngine {
  constructor() {
    this.successCount = 0;
    this.failureCount = 0;
  }

  success() {
    this.successCount += 1;
  }

  recovered() {
    this.successCount += 1;
  }

  failure() {
    this.failureCount += 1;
  }

  api(status) {
    if (status >= 200 && status < 300) {
      this.success();
      return;
    }

    this.failure();
  }

  calculate() {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 1 : this.successCount / total;
  }
}

module.exports = ConfidenceEngine;
