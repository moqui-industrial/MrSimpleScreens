# SimpleScreens migration tests

Run from the MR-Moqui repository root with a current build and a runtime containing the Mantle forks and this component. The component name is still `SimpleScreens`.

```sh
cargo build -p moqui
# Full Mantle + SimpleScreens suite; default database mode is a fresh disposable fixture.
target/debug/moqui test mantle-usl SimpleScreens --keep --junit /tmp/mrss-junit

# Two screen specs plus their eight prerequisite Mantle flow specs:
target/debug/moqui test mantle-usl SimpleScreens \
  --spec MyAccountScreens,SimpleScreensRender --keep --junit /tmp/mrss-screen-junit
```

Use `MOQUI_RUNTIME=<isolated-runtime>` if testing outside the default runtime. `--keep` retains the disposable fixture. **Do not use `--db existing` against valuable data**: specs create orders, payments, messages, tasks, time entries and authentication factors. Re-running fixture specs in an already-used database causes ID collisions, not a useful migration check.

Both component arguments are necessary with this runner: cross-component dependencies must be selected. The eight flow dependencies are AccountingActivities, AssetReservationMultipleThreads, OrderProcureToPayBasicFlow, OrderToCashBasicFlow, OrderToCashTime, ReturnToResponseBasicFlow, WorkPlanToCashBasicFlow and RestApiTests. They supply pinned orders 55400/55401, invoices 55100/55400/55900, financial accounts and worker credentials. Do not remove dependencies without replacing the fixtures.

## Results — 2026-10-16/17

- Full suite: **411 features passed, 0 failed/ignored/skipped, 45 specs**.
- Selected fixture + screen suite: **151 features passed, 0 failed, 10 specs**.
- The final full run followed native frontend/calendar changes and a fresh debug build.

Logs/JUnit: `/tmp/mrss-full-tests.log`, `/tmp/mrss-full-junit`, `/tmp/mrss-final-tests.log`, `/tmp/mrss-final-junit`. Local artifact paths are not portable fixtures.

## Coverage

- `MyAccountScreens`: worker renders and real message/event/task/time-entry transitions; single-use authentication code creation, JSON session storage, redirect and one-time display.
- `SimpleScreensRender`: parameter-free screen discovery plus populated customer, supplier, party, catalog, order, shipment, asset, invoice, payment, financial-account and financial-report screens; customer/supplier search and exact-party autocomplete JSON; SalesSummary with real flow data; card editor and ten expiration-year options.
- Order, invoice, payment-check and payment-detail print content assertions use the legacy `renderMode=xsl-fo` alias and supported HTML-print replacements. Assertions were retained, not weakened to accept empty output.
- SalesSummary's top-product service reports the previous complete period. Its test date is January 2 of next year so current-year fixture orders are included even in time zones west of UTC.
- Wiki discovery exclusions require page/space-specific fixtures. SalesSummary is tested explicitly rather than in the parameter-free discovery loop.

One discovery feature visits many screens; feature count is not unique-screen count. Tests disable authz around features and restore it afterward. Passing does not establish production authorization, organization isolation, CSRF enforcement, every browser interaction or physical printing.

## Browser smoke

`browser-smoke.mjs` uses Node's built-in WebSocket and Chromium DevTools, with no npm dependencies. Start a server with disposable flow data, a SimpleScreens app mount at `/apps/SimpleScreens` and appropriate **test-only** access for its demo user, then run:

```sh
MRSS_BASE_URL=http://127.0.0.1:18081 \
MRSS_USERNAME=john.doe MRSS_PASSWORD=moqui \
MRSS_CHROMIUM=/usr/bin/chromium MRSS_OUTPUT_DIR=/tmp \
node runtime/component/MrSimpleScreens/test/browser-smoke.mjs

pdftotext /tmp/mrss-order-smoke.pdf -
```

Defaults target disposable local demo data. Do not reuse demo credentials or the test authorization grant for production. The smoke checks customer, order, invoice, payment and My Account content, uncaught JS exceptions, real SVG barcode bars and PDF generation. It records JSON, PNG and PDF outputs. It does not create the server, data or authorization policy; SimpleScreens normally relies on its mounting application for the latter.

Additional scoped calendar/QVT/dialog tests and their limitations are recorded in `../MIGRATION-STATUS.md`. The calendar's native agenda layout differs from FullCalendar's hourly grid. PDF generation/content is not check-stock, pagination or visual-parity certification.

## Random Playwright smoke

With the same disposable server and test user described above:

```sh
cd runtime/component/MrSimpleScreens/test
npm ci
npx playwright install chromium  # or set MRSS_CHROMIUM=/usr/bin/chromium
MRSS_BASE_URL=http://127.0.0.1:18081 npm run browser
# Replay the initially sampled screen, including its create-dialog/filter checks:
MRSS_SCREEN=screen/SimpleScreens/Survey/FindSurvey.xml npm run browser
```

`random-screen.spec.mjs` randomly selects an edited `Find*.xml` with a list/filter dialog and no screen-level required parameters. It logs and attaches the selection; `MRSS_DIFF_BASE` selects the pre-migration Git revision (default `HEAD`, including staged/unstaged edits). This intentionally samples parameter-free find screens, not record editors or print screens. Supply disposable Mantle demo data and mounting-application authorization as above; the test does not provision either.

Checks: login, HTTP status, expected URL/list/filter control, rendering errors, browser exceptions/console errors, failed HTTP responses, desktop overflow and list width. Survey additionally opens/closes New Survey and submits its search dialog without creating records. Screenshots are always attached; failures retain a Playwright trace. Outputs go to `test-results/` or `MRSS_OUTPUT_DIR`. `MRSS_USERNAME`/`MRSS_PASSWORD` override the demo credentials.

Verified with system Chromium: randomly sampled `Survey/FindSurvey.xml` and `Order/FindOrder.xml`, both passed; screenshots visually inspected. Lists were empty under their default filters, so this is a layout/framework smoke, not verification of populated rows or business transactions. No significant layout/framework defects were observed in these runs.

## Lint and host regressions

```sh
target/debug/moqui lint --groovy runtime/component/MrSimpleScreens
target/debug/moqui lint --screens /tmp/mrss-screen-lint.txt
cargo test -p moqui-core --lib
cargo test -p moqui-lib barcode
```

Current component/runtime screen lint has zero parse failures. Component lint retains 17 known false positives: literal `$` form-location strings and Boolean `hasNoItems` checks. Legacy `.ftl` location detections are compatibility adapters; originals remain as oracles. Dynamic/custom template locations need runtime tests.

Host result: **939 passed, 0 failed, 1 ignored**; includes 18 print tests and nested-map/entity flattening regression. Barcode library: three passed. Required host changes are currently uncommitted, as is the component migration; this is not released-framework or clean-checkout certification.
