# MrSimpleScreens migration status

Validated 2026-10-16/17 against the local MR-Moqui working tree. **411 features pass in 45 specs**, including all Mantle specs and the two SimpleScreens specs. This is a working migration, not a claim of complete browser/authorization/print-layout parity or a released artifact.

Component name remains `SimpleScreens`; the repository/directory is `MrSimpleScreens`. The unchanged upstream baseline is `5aed7ffba7231babdccfb0bd46cb6db66195487c`. `MIGRATION-INVENTORY.md` is the frozen pre-port inventory. Process: `plans/ScreenMigrationTutorial.md` in MR-Moqui.

## Implemented

- Mechanical conversion followed by manual ports of screen actions, expressions, transitions and embedded templates. XML layout and Mantle service contracts retained.
- Java collections/classes, closures, map access/copying, decimal operations/truthiness, empty collections and dates converted to the supported JavaScript/host APIs.
- Payment/contact forms flatten nested maps and entity values through `CollectionUtilities.flattenNestedMap`, preserving scalar types. Credit-card year options match Java's ten-year list. Single-use authentication codes use JSON session storage and one-time display.
- All 29 remaining original FreeMarker templates have supported replacements; originals remain as reference. Eighteen XSL-FO documents now have HTML-print replacements, with additional fragments for macros/recursive invoice rows. Email and sales-stat/chart templates are ported too. Legacy SimpleScreens default template locations map to replacements; arbitrary external custom FreeMarker layouts still require their own port.
- Native browser controls replace jQuery/Bootstrap dependencies: order audit history uses escaped, keyboard-accessible details; report details use dialogs; project status charts use SVG. Nav components use supported request helpers.
- Four calendars use `MrCalendar.js`, a native month/week/day calendar backed by the actual Mantle REST event/task endpoints. Existing create forms and detail links remain. It is a compact agenda/day-column view, not FullCalendar's hourly time-grid.
- Supporting host fixes/additions include print query-mode selection and standalone rendering, real Code 128 SVG, flattening, session/form/entity helpers and the APIs described in the tutorial. These host changes must ship with the component.

## Verified results

| Check | Result |
| --- | --- |
| Current framework debug build | Pass |
| All Mantle + SimpleScreens specs | **411 passed, 0 failed/ignored/skipped; 45 specs** |
| Selected eight Mantle fixtures + two screen specs | **151 passed, 0 failed** |
| MR-Moqui core unit tests | **939 passed, 0 failed, 1 ignored** |
| Host print regressions | **18 passed**, included in the core result |
| Code 128 library tests | **3 passed** |
| Existing webroot JS tests run in final coordinator check | **27 passed** |
| Component Groovy lint | **0 parse failures**, 380 files / 9,741 expression sites |
| Whole isolated runtime screen lint | **0 parse failures**, 504 files / 10,815 expression sites |
| Component XML syntax and diff whitespace checks | Pass |

The final full suite ran after the frontend/calendar changes, using a newly built `target/debug/moqui`. The feature count includes 344 Mantle features and 67 screen features; the discovery feature loops over many screens, so feature count is not unique-screen count.

Remaining component lint flags are 14 literal `$` form-location strings and three Boolean `hasNoItems` conditions; these are false positives and were not changed to hide warnings. Eight legacy `.ftl` location detections are compatibility-adapter expressions, not direct rendering of those original files. Dynamic locations still require runtime testing; original Groovy tests are retained as reference, not executed by the JS runner.

## Actual browser and PDF checks

Authenticated Chromium smoke checks passed customer lookup, order detail, invoice, payment and My Account, with **zero uncaught JavaScript exceptions**. The order HTML-print page contained real SVG barcode bars; Chromium generated a PDF and `pdftotext` confirmed the supplier/customer, product descriptions and `$23,795.00` total.

The browser smoke used a temporary SimpleScreens app mount and an explicit **test-only ADMIN authorization grant in an isolated runtime**. SimpleScreens is normally mounted by an application such as MarbleERP/PopCommerce; its own default configuration mounts only My Account. The initial 403 without an app grant was preserved as a useful authorization check, not bypassed globally. No production grant or application mount was added to component data.

Additional scoped Chromium checks exercised all four HTML calendars with successful REST requests, month/week/day navigation, event creation dialog opening, live QVT calendar rendering with three real tasks, Vue/Quasar nav mounting, sales-summary dialog opening/closing and project SVG output. Isolated calendar fixtures checked exclusive-end multi-day events, HTML-looking titles, unsafe link rejection and independent source failures.

Browser smoke source is retained in `test/browser-smoke.mjs`. It reads `MRSS_BASE_URL`, `MRSS_USERNAME`, `MRSS_PASSWORD`, `MRSS_CHROMIUM` and `MRSS_OUTPUT_DIR`; defaults are for disposable local demo data only. See `test/README.md`.

## Remaining acceptance work / limits

- In-process specs disable authorization around individual features. Neither those specs nor the explicitly granted browser smoke establish a full production role/organization-isolation/CSRF policy.
- Wiki-specific fixtures and browser version-comparison behavior are not covered. WikiCompare retains its independent external JsDiff dependency.
- Shipment scan-receive's native dialog integration is syntax/lint checked, not end-to-end scanned/received in-browser; the available shipment fixture was already ineligible.
- Organization preference mutation and every dialog/AJAX/transition/client widget have not been exhaustively exercised.
- HTML-print content and an actual order PDF are verified, **not pixel/FOP pagination parity or physical check-stock alignment**. CSS retains check/card coordinates and table headings; general FO repeated running regions/page citations are not fully equivalent. Private `component://`/`content://` logo/signature URIs may need browser-resolvable/data URLs. Test every deployed custom print layout and printer.
- The host and component are uncommitted working-tree changes; results are not clean-release reproducibility proof. The initial unchanged upstream copy was pushed; migration changes have not been committed or pushed.

## Evidence

- `/tmp/mrss-full-tests.log`, `/tmp/mrss-full-junit`: final 411-feature run.
- `/tmp/mrss-final-tests.log`, `/tmp/mrss-final-junit`: selected 151-feature run.
- `/tmp/mrss-core-all-tests.log`, `/tmp/mrss-print-host-tests.log`, `/tmp/mrss-flatten-host-tests.log`, `/tmp/mrss-barcode-tests.log`.
- `/tmp/mrss-final-lint.log`, `/tmp/mrss-final-screen-lint.txt`, `/tmp/mrss-js-final-tests.log`.
- `/tmp/mrss-browser-results.json`, `/tmp/mrss-order-smoke.pdf`, `/tmp/mrss-order-smoke.png`, `/tmp/mrss-order-smoke.txt`.
- `/tmp/mrss-print-migration-summary.md`, `/tmp/mrss-frontend-summary.md`: scoped details and limitations. Early print probes that isolated barcode calls were diagnostic only; final component and browser checks used the real rebuilt barcode API.

Temporary paths are local artifacts, not portable fixtures. Reproduction commands and dependency requirements are in `test/README.md`.
