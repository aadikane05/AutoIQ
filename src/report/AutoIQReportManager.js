const fs = require("fs/promises");
const { ARTIFACTS_DIR, REPORT_FILE } = require("../config/ArtifactConfig");

class AutoIQReportManager {
  static rows = [];

  static reset() {
    AutoIQReportManager.rows = [];
  }

  static log(testName, status, confidence, screenshot, errorMessage = "") {
    AutoIQReportManager.rows.push({
      testName,
      status,
      confidence: Number(confidence ?? 0).toFixed(2),
      screenshot,
      errorMessage
    });
  }

  static async generateReport(fileName = REPORT_FILE) {
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

    const rows = AutoIQReportManager.rows
      .map(row => {
        const screenshotCell = row.screenshot
          ? `<a href="${AutoIQReportManager.escapeHtml(row.screenshot)}">View</a>`
          : "N/A";

        return [
          "<tr>",
          `<td>${AutoIQReportManager.escapeHtml(row.testName)}</td>`,
          `<td>${AutoIQReportManager.escapeHtml(row.status)}</td>`,
          `<td>${AutoIQReportManager.escapeHtml(row.confidence)}</td>`,
          `<td>${screenshotCell}</td>`,
          `<td>${AutoIQReportManager.escapeHtml(row.errorMessage || "")}</td>`,
          "</tr>"
        ].join("");
      })
      .join("");

    const html = [
      "<html><head><title>AutoIQ Report</title>",
      "<style>",
      "body{font-family:Helvetica,Arial,sans-serif;margin:24px;background:#f7f7f2;color:#1d1d1d;}",
      "table{border-collapse:collapse;width:100%;background:#fff;}",
      "th,td{border:1px solid #d0d0c8;padding:10px;text-align:left;vertical-align:top;}",
      "th{background:#ece9dc;}",
      "h2{margin-top:0;}",
      "</style></head><body>",
      "<h2>AutoIQ Test Execution Report</h2>",
      "<table>",
      "<tr><th>Test</th><th>Status</th><th>Confidence</th><th>Screenshot</th><th>Error</th></tr>",
      rows,
      "</table></body></html>"
    ].join("");

    await fs.writeFile(fileName, html, "utf8");
  }

  static escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}

module.exports = AutoIQReportManager;
