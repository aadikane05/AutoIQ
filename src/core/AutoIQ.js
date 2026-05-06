const RetryConfig = require("../config/RetryConfig");
const { artifactPath } = require("../config/ArtifactConfig");
const AuditLogger = require("./AuditLogger");
const ConfidenceEngine = require("./ConfidenceEngine");
const FailureIntelligence = require("./FailureIntelligence");
const SelfHealingEngine = require("./SelfHealingEngine");

class AutoIQ {
  constructor(executor) {
    this.executor = executor;
    this.healer = new SelfHealingEngine();
    this.intelligence = new FailureIntelligence();
    this.audit = new AuditLogger();
    this.confidence = new ConfidenceEngine();
  }

  async click(locator) {
    return this.executeWithRetry("CLICK", locator, candidate =>
      this.executor.smartClick(candidate)
    );
  }

  async type(locator, value) {
    return this.executeWithRetry("TYPE", locator, candidate =>
      this.executor.smartType(candidate, value)
    );
  }

  async isVisible(locator) {
    try {
      const visible = await this.executor.isVisible(locator);
      this.confidence.success();
      this.audit.success("VISIBLE", locator);
      return visible;
    } catch (error) {
      return this.recover("VISIBLE", locator, candidate =>
        this.executor.isVisible(candidate), error);
    }
  }

  async apiRequest(method, url, body = "") {
    const response = await this.executor.apiRequest(method, url, body);
    this.audit.api(url, response.statusCode);
    this.confidence.api(response.statusCode);
    return response;
  }

  confidenceScore() {
    return this.confidence.calculate();
  }

  async safeClick(locator) {
    try {
      await this.executor.smartClick(locator);
      this.confidence.success();
    } catch (error) {
      this.confidence.failure();
      await this.executor.takeScreenshot(artifactPath("ERROR_click.png"));
      throw error;
    }
  }

  async safeType(locator, value) {
    try {
      await this.executor.smartType(locator, value);
      this.confidence.success();
    } catch (error) {
      this.confidence.failure();
      await this.executor.takeScreenshot(artifactPath("ERROR_type.png"));
      throw error;
    }
  }

  async executeWithRetry(actionName, locator, action) {
    let attempt = 0;
    let lastError;

    while (attempt <= RetryConfig.MAX_RETRIES) {
      try {
        const result = await action(locator);
        this.confidence.success();
        this.audit.success(actionName, locator);
        return result;
      } catch (error) {
        lastError = error;
        attempt += 1;

        if (attempt <= RetryConfig.MAX_RETRIES) {
          this.audit.retry(actionName, locator, attempt);
        }
      }
    }

    return this.recover(actionName, locator, action, lastError);
  }

  async recover(actionName, locator, action, error) {
    const report = this.intelligence.analyze(error);
    this.audit.failure(actionName, locator, report.reason);

    const healedLocator = this.healer.heal(locator, report);
    this.audit.healed(locator, healedLocator);

    try {
      const result = await action(healedLocator);
      this.confidence.recovered();
      return result;
    } catch (recoveryError) {
      this.confidence.failure();
      await this.executor.takeScreenshot(artifactPath(`ERROR_${actionName}.png`));
      throw recoveryError;
    }
  }
}

module.exports = AutoIQ;
