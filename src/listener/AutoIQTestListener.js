const { artifactPath } = require("../config/ArtifactConfig");
const AutoIQReportManager = require("../report/AutoIQReportManager");

class AutoIQTestListener {
  async onTestSuccess(result) {
    AutoIQReportManager.log(
      result.name,
      "PASS",
      result.instance.autoIQ.confidenceScore(),
      null
    );
  }

  async onTestFailure(result) {
    const screenshot = artifactPath(`FAIL_${result.name}.png`);
    const screenshotExecutor =
      result.instance?.web ||
      result.instance?.desktop ||
      result.instance?.autoIQ?.executor;

    if (screenshotExecutor?.takeScreenshot) {
      await screenshotExecutor.takeScreenshot(screenshot).catch(() => undefined);
    }

    AutoIQReportManager.log(
      result.name,
      "FAIL",
      result.instance?.autoIQ?.confidenceScore?.() ?? 0,
      screenshot,
      result.error?.stack || result.error?.message || String(result.error || "")
    );
  }

  async onTestSkipped(result) {
    AutoIQReportManager.log(
      result.name,
      "SKIP",
      result.instance?.autoIQ?.confidenceScore?.() ?? 0,
      null,
      result.reason || "Skipped"
    );
  }

  async onFinish() {
    await AutoIQReportManager.generateReport();
  }
}

module.exports = AutoIQTestListener;
