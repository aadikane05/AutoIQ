const path = require("path");

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");

function artifactPath(fileName) {
  return path.join(ARTIFACTS_DIR, fileName);
}

module.exports = {
  ARTIFACTS_DIR,
  REPORT_FILE: artifactPath("AutoIQ-Report.html"),
  artifactPath
};
