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
- `ClientAccess`: the test-only grant of the client specs' server (below); `OrderRoleFilters` and `ScreenReport` are
  under Lint and Screen report.
- Order, invoice, payment-check and payment-detail print content assertions use the legacy `renderMode=xsl-fo` alias and supported HTML-print replacements. Assertions were retained, not weakened to accept empty output.
- SalesSummary's top-product service reports the previous complete period. Its test date is January 2 of next year so current-year fixture orders are included even in time zones west of UTC.
- Wiki discovery exclusions require page/space-specific fixtures. SalesSummary is tested explicitly rather than in the parameter-free discovery loop.

One discovery feature visits many screens; feature count is not unique-screen count. Tests disable authz around features and restore it afterward. Passing does not establish production authorization, organization isolation, CSRF enforcement, every browser interaction or physical printing.

## Client tests: the browser smoke and the Find screens

`test/client/` holds the client specs, which run outside the server against one that is running, in headless Chromium
(plans/ClientTestHarness.md in the MR-Moqui repository). No npm, Node or Python is needed. `--serve` starts the server
`test/client/suite.js` declares, runs the specs against it and stops it:

```sh
moqui test-client SimpleScreens --serve
moqui test-client SimpleScreens --serve --spec FindScreens --param screen=Survey/FindSurvey
moqui test-client SimpleScreens --serve --spec FindScreens --param screen=Order/FindOrder --headed
./moq test-client SimpleScreens --serve                 # the same through moq, building first
```

The server is a child `moqui test mantle-usl SimpleScreens --spec SimpleScreensRender,ClientAccess --db snapshot
--serve` on a scratch runtime: SimpleScreensRender's eight Mantle flows supply the orders, invoices and payments, and
`ClientAccess.spec.js` makes the **test-only** grant that lets john.doe's ADMIN group use the app (SimpleScreens
normally relies on the application that mounts it; ADMIN alone gets 403). `test/MoquiConf.xml` mounts the app at
`/apps/SimpleScreens`; it merges into `moqui test` runs only. Neither the mount nor the grant is in `data/` or the
component's `MoquiConf.xml`, so no real database or server gets them. The server's output goes to `server-<n>.log` in
the output directory.

Against a server of your own with disposable flow data, the mount and the grant (`moqui test SimpleScreens --spec
ClientAccess --db existing` on **that** server's database only), pass `--server http://127.0.0.1:18081` instead of
`--serve`. `--param user=` and `--param password=` (or `MOQUI_TEST_USER`, `MOQUI_TEST_PASSWORD`) override the demo
credentials. Do not reuse demo credentials or the test grant for production.

- `BrowserSmoke.spec.js` (was `browser-smoke.mjs`): customer, order, invoice, payment and My Account pages each show
  their text; PrintOrder 55400 shows its total and real SVG barcode bars, and prints a PDF (`PrintOrder-55400.pdf`,
  with a full-page `PrintOrder-55400.png`). Reading the PDF's text (`pdftotext`) was a manual step and is not ported.
- `FindScreens.spec.js` (was the Playwright `random-screen.spec.mjs`): every `Find*.xml` with a list and its Find
  Options dialog (`form-list header-dialog="true"`) and no required parameter is a row (32 today), or only the one
  `--param screen=` names. Each row checks the status, the URL, the list table with a visible header, the Find Options
  button, render-error text, at most 2 px of horizontal overflow and a list wider than 300 px, and saves a full-page
  `FindScreens-<screen>.png`. The Survey feature opens New Survey (its fields editable, Create shown, inside the
  viewport), closes it with Escape, and submits Find Options' Find. The old test sampled one edited screen from `git
  diff` at random; a row per screen makes a failure repeat. Lists may be empty under their default filters, so this is
  a layout and framework smoke, not a check of rows or business transactions.

Every row also fails on its page problems: uncaught exceptions, console errors, responses of 400 and up, failed loads,
render errors and error notifications. A failure leaves `failed-<feature>-<n>.png` and `.txt` (the URL, the problems
and the page text) for each open page.

Output goes to `runtime/tmp/test-client/<yyyyMMdd-HHmmss>-<pid>/` (printed at the end), or `--out <dir>`; `--junit
<dir>` writes JUnit XML that lists the failure files. With no Chromium found (`--chromium`, `MOQUI_CHROMIUM`, `./moq
chromium-download`, or chromium or google-chrome on the PATH) the browser features are skipped; `--fail-on-skip` makes
that a failure, for CI.

Additional scoped calendar/QVT/dialog checks and their limitations are recorded in `../MIGRATION-STATUS.md`. The
calendar's native agenda layout differs from FullCalendar's hourly grid. PDF generation/content is not check-stock,
pagination or visual-parity certification.

## Lint and host regressions

The order role-filter regression (`OrderRoleFilters.spec.js`, was the `node:test` `order-role-filters.test.mjs`) takes
the two OrgInternal `econdition ignore` expressions from `FindOrder.xml` and evaluates them in the real engine for ten
`orderType` values, against Java's case-insensitive sales/purchase behavior, including Any/empty values:

```sh
./moq test SimpleScreens --spec OrderRoleFilters
```

```sh
target/debug/moqui lint --groovy runtime/component/MrSimpleScreens
target/debug/moqui lint --screens /tmp/mrss-screen-lint.txt
cargo test -p moqui-core --lib
cargo test -p moqui-lib barcode
```

Current component/runtime screen lint has zero parse failures. Component lint retains 17 known false positives: literal `$` form-location strings and Boolean `hasNoItems` checks. Legacy `.ftl` location detections are compatibility adapters; originals remain as oracles. Dynamic/custom template locations need runtime tests.

Host result: **939 passed, 0 failed, 1 ignored**; includes 18 print tests and nested-map/entity flattening regression. Barcode library: three passed. Required host changes are currently uncommitted, as is the component migration; this is not released-framework or clean-checkout certification.

## Screen report

```sh
./moq test SimpleScreens --spec ScreenReport -D mrss_screen_report=/tmp/mrss-report.md
```

`ScreenReport.spec.js` (was `screen-report.py`) lists every screen with whether the discovery render (the
no-required-parameter paths SimpleScreensRender renders), a targeted server spec or the browser smoke reaches it, and
its companion files. It is ignored unless `mrss_screen_report` names the file to write. It is a report for choosing
work; the Migrated/Validated checklist in `../MIGRATION-STATUS.md` is ticked by hand.
