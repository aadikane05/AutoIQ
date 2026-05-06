class AuditLogger {
  success(action, locator) {
    console.log(`[OK] ${action} -> ${locator}`);
  }

  failure(action, locator, reason) {
    console.log(`[FAIL] ${action} -> ${locator} | ${reason}`);
  }

  healed(oldLocator, newLocator) {
    console.log(`[HEAL] ${oldLocator} -> ${newLocator}`);
  }

  api(url, status) {
    console.log(`[API] ${url} -> ${status}`);
  }

  retry(action, locator, attempt) {
    console.log(`[RETRY] ${action} -> ${locator} | Attempt ${attempt}`);
  }
}

module.exports = AuditLogger;
