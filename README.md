# AutoIQ
AutoIQ is a JavaScript Selenium framework with built-in auto-wait synchronization, supporting Desktop, Mobile, Browser, and API validation. The test layer does not use Playwright and does not need manual sleeps in test code.

## Structure

```text
src/
  base/       test setup
  config/     retry, wait, artifact paths
  core/       AutoIQ engine, confidence, retry, healing
  executor/   Selenium web adapter and API adapter
  listener/   result handling
  report/     HTML report generation
  test/
    api/         API test cases
    browser/     browser test cases
    desktopApp/  desktop app test cases
    mobileTest/  mobile test cases
    AutoIQRunner.js
```

## Execution

```bash
npm install
npm test
```

Category runs:

```bash
npm run test:api
npm run test:browser
npm run test:desktop
npm run test:mobile
npm run test:all
```

## Notes

- Browser automation runs through Selenium WebDriver.
- Auto wait synchronization is built into `WebAdapter`, so actions like type, click, scroll, and screenshot wait for the UI to stabilize.
- Reports and screenshots are written to `artifacts/`.
- `node_modules/`, `artifacts/`, `target/`, and `.DS_Store` are ignored by `.gitignore`.
