# MrSimpleScreens migration status

Revalidated 2026-10-23 against the local MR-Moqui working tree (component HEAD `12f3796`, clean and in step with origin/master). **767 features in 80 specs: 766 pass, 1 fails** (see Known failure). The original 2026-10-16/17 validation was 411 features in 45 specs; the growth is Mantle specs added since and three SimpleScreens specs (80 features: `SimpleScreensRender` 54, `MyAccountScreens` 18, `GitScreens` 8). This is a working migration, not a claim of complete browser/authorization/print-layout parity or a released artifact.

Component name remains `SimpleScreens`; the repository/directory is `MrSimpleScreens` (`git@github.com:moqui/MrSimpleScreens.git`). The unchanged upstream baseline is `5aed7ffba7231babdccfb0bd46cb6db66195487c`. `MIGRATION-INVENTORY.md` is the frozen pre-port inventory (its line numbers and counts describe that upstream source, not the current files). Process: `plans/ScreenMigrationTutorial.md` in MR-Moqui.

## Known failure

`SimpleScreensRender` renders `Accounting/Invoice/EditInvoice?invoiceId=55400` and expects `ORG_ZIZI_RETAIL`, `Payment Sent` and `Applied Payments $23,830.00`; one of those is missing from the output (no error messages). It fails in the full run on 2026-10-23. The most recent commit (`633faeb`, 2026-10-23, the payment dialogs now hide on a zero unpaid total) touched this screen and is the first suspect, but this was not bisected.

## Implemented

- Mechanical conversion followed by manual ports of screen actions, expressions, transitions and embedded templates. XML layout and Mantle service contracts retained.
- Java collections/classes, closures, map access/copying, decimal operations/truthiness, empty collections and dates converted to the supported JavaScript/host APIs.
- Payment/contact forms flatten nested maps and entity values through `CollectionUtilities.flattenNestedMap`, preserving scalar types. Credit-card year options match Java's ten-year list. Single-use authentication codes use JSON session storage and one-time display.
- All 29 remaining original FreeMarker templates have supported replacements; originals remain as reference. Eighteen XSL-FO documents now have HTML-print replacements, with additional fragments for macros/recursive invoice rows. Email and sales-stat/chart templates are ported too. Legacy SimpleScreens default template locations map to replacements; arbitrary external custom FreeMarker layouts still require their own port.
- Native browser controls replace jQuery/Bootstrap dependencies: order audit history uses escaped, keyboard-accessible details; report details use dialogs; project status charts use SVG. Nav components use supported request helpers.
- Four calendars use `MrCalendar.js`, a native month/week/day calendar backed by the actual Mantle REST event/task endpoints. Existing create forms and detail links remain. It is a compact agenda/day-column view, not FullCalendar's hourly time-grid.
- Added since the first validation: Git repositories of projects and the commits, branches and tags of tasks (`Project/EditRepositories`, `Project/GitCommit`, `Task/EditSource`, boxes on the project and task summaries, My Account's Git Access, a Content option backed by Git LFS), covered by `GitScreens`; the wiki and product/category content compare screens use the framework's server-side version diff (`ResourceReference.getVersionDiff`) instead of jsdiff from a CDN, with a wiki feature in `SimpleScreensRender`; print headers repeat on every page and the running footer with page number is reproduced; party drop-downs and person lookups leave out another user's personal contact (`Party.privateOwnerUserId`); record-update notification topics go to the automatic Updates inbox; ProjectSummary and the find screens no longer call host decimal `valueOf` or Groovy `take()`; `EditInvoice` payment dialogs hide on a zero unpaid total; `SimpleReport` `FieldList` arrays; `component.xml` dependencies renamed (`mr-mantle-usl`, no component prefixes).
- Supporting host fixes/additions include print query-mode selection and standalone rendering, real Code 128 SVG, flattening, session/form/entity helpers and the APIs described in the tutorial. These host changes must ship with the component.

## Verified results (2026-10-23)

| Check | Result |
| --- | --- |
| Current framework debug build (`cargo build -p moqui`) | Pass |
| All Mantle + SimpleScreens specs (`moqui test mantle-usl SimpleScreens`) | **766 passed, 1 failed; 80 specs** (see Known failure) |
| Component Groovy lint (`moqui lint --groovy`) | **0 parse failures**, 384 files / 9,903 expression sites; 64 flagged sites (14 `gstring-dollar-name`, 47 `static-class`, 3 `empty-collection-truthiness`) |
| Runtime screen lint (`moqui lint --screens`) | **0 parse failures**, 919 files / 20,522 expression sites (whole runtime, base components included) |
| Component XML syntax | 0 files that do not parse |

Not rerun on 2026-10-23 and carried from the first validation (2026-10-16/17): MR-Moqui core unit tests (939 passed, 0 failed, 1 ignored), host print regressions (18), Code 128 library tests (3), webroot JS tests (27), and the Chromium browser/PDF checks below. The feature count includes 687 Mantle features and 80 screen features; the discovery feature loops over many screens, so feature count is not unique-screen count.

The one Groovy file the lint does not parse is `src/test/groovy/MyAccountScreenTests.groovy`, the retained original test, which the JS runner does not execute. The 14 `$` form-location strings (the `gstring-dollar-name` flags) and the three Boolean `hasNoItems` conditions are false positives and were not changed to hide warnings. Eight legacy `.ftl` locations are compatibility-adapter expressions, not direct rendering of those original files (lint reports 8 FreeMarker locations not compiled). Dynamic locations still require runtime testing.

## Actual browser and PDF checks (2026-10-16/17)

These were run once, before the Git, compare, print-header and privacy changes above; they have not been repeated.

Authenticated Chromium smoke checks passed customer lookup, order detail, invoice, payment and My Account, with **zero uncaught JavaScript exceptions**. The order HTML-print page contained real SVG barcode bars; Chromium generated a PDF and `pdftotext` confirmed the supplier/customer, product descriptions and `$23,795.00` total.

The browser smoke used a temporary SimpleScreens app mount and an explicit **test-only ADMIN authorization grant in an isolated runtime**. SimpleScreens is normally mounted by an application such as MarbleERP/PopCommerce; its own default configuration mounts only My Account. The initial 403 without an app grant was preserved as a useful authorization check, not bypassed globally. No production grant or application mount was added to component data.

Additional scoped Chromium checks exercised all four HTML calendars with successful REST requests, month/week/day navigation, event creation dialog opening, live QVT calendar rendering with three real tasks, Vue/Quasar nav mounting, sales-summary dialog opening/closing and project SVG output. Isolated calendar fixtures checked exclusive-end multi-day events, HTML-looking titles, unsafe link rejection and independent source failures.

Browser smoke source is retained in `test/browser-smoke.mjs`. It reads `MRSS_BASE_URL`, `MRSS_USERNAME`, `MRSS_PASSWORD`, `MRSS_CHROMIUM` and `MRSS_OUTPUT_DIR`; defaults are for disposable local demo data only. See `test/README.md`.

## Screen checklist

One row per screen XML under `screen/` (371), sorted by path below `screen/`, case-insensitive. Tick a box by editing `[ ]` to `[x]` in the same commit as the work.

**Migrated** means both: the source is converted (Groovy to JavaScript, Java classes and collections to the supported APIs, FreeMarker/XSL-FO to supported templates, jQuery/CDN libraries to native controls), and the screen has been exercised through the TUI. The TUI pass is the first-pass check because an agent can drive it from a terminal and iterate quickly. **Validated** is a later phase: the screen checked in a browser (rendering, dialogs, AJAX and transitions, print output, authorization as the mounting app configures it). Do not tick Validated during the TUI pass.

Nothing is ticked yet. The earlier JS specs and Chromium smoke runs show some screens render, but they predate this definition and did not go through the TUI, so they do not count. `test/screen-report.py` writes a report of which screens those specs already reach; use it to choose where to start, not as a source of ticks.

### Process

A full automated test suite is not a goal of this migration. Agents do the testing themselves, as part of changing a screen, and the screen is only as migrated as that testing showed. For each screen:

1. Find what is left to convert: `moqui lint --groovy runtime/component/MrSimpleScreens` and `moqui lint --screens`, the screen's `.ftl`/XSL-FO companions, and `plans/ScreenMigrationTutorial.md`. Keep XML layout and Mantle service contracts; convert in a mechanical pass first and review its diff, then fix by hand (decimals, empty-collection truthiness, dates, copied service parameters).
2. Drive it in the TUI on a runtime with the demo and flow data loaded, as a user with the access the screen needs: `moqui tui --user john.doe --path /apps/SimpleScreens/<path>` (a dev instance only), or `--snapshot <path>` for one rendering and `--agent` for scripted commands (`docs/TUI.md`, For agents). Mount SimpleScreens as an app in the runtime you test in (it normally relies on an application such as MarbleERP or PopCommerce; its own configuration mounts only My Account), and keep any test-only grant out of component data.
3. Exercise what the screen does, not only that it renders: fill and submit its forms, run its transitions and dialogs, try the empty and error cases, and compare results with the data the services should have changed. Fix what is wrong and repeat until it behaves.
4. Tick Migrated for the screen, and note in the commit what was run and anything left over. Add a JS spec feature only where a regression guard is cheap, such as a screen with real fixture data or a bug that was easy to reintroduce; do not add one per screen.
5. Screens that need fixtures (wiki, shipments ready to receive, organization preferences) get the fixtures created in the test runtime as part of testing them.

Validated rows are done later in a browser by the same method, with the print outputs checked as PDF.

| Screen | Migrated | Validated |
| --- | :-: | :-: |
| `BasicHandheld/Warehouse` | [ ] | [ ] |
| `BasicHandheld/Warehouse/Asset` | [ ] | [ ] |
| `BasicHandheld/Warehouse/Asset/ReceiveAsset` | [ ] | [ ] |
| `BasicHandheld/Warehouse/Asset/SelectAsset` | [ ] | [ ] |
| `BasicHandheld/Warehouse/dashboard` | [ ] | [ ] |
| `BasicHandheld/Warehouse/Shipping` | [ ] | [ ] |
| `BasicHandheld/Warehouse/Shipping/PickLocationMoves` | [ ] | [ ] |
| `email/InvoiceFinalized` | [ ] | [ ] |
| `email/InvoicesPastDue` | [ ] | [ ] |
| `email/OrderPlaced` | [ ] | [ ] |
| `email/ShipmentShipped` | [ ] | [ ] |
| `MyAccount` | [ ] | [ ] |
| `MyAccount/Expense` | [ ] | [ ] |
| `MyAccount/Expense/EditExpenseInvoice` | [ ] | [ ] |
| `MyAccount/Expense/EditExpenseInvoiceItems` | [ ] | [ ] |
| `MyAccount/Expense/FindExpenseInvoice` | [ ] | [ ] |
| `MyAccount/User` | [ ] | [ ] |
| `MyAccount/User/Account` | [ ] | [ ] |
| `MyAccount/User/Calendar` | [ ] | [ ] |
| `MyAccount/User/Calendar/EventDetail` | [ ] | [ ] |
| `MyAccount/User/Calendar/MyCalendar` | [ ] | [ ] |
| `MyAccount/User/ContactInfo` | [ ] | [ ] |
| `MyAccount/User/ContactInfo/UpdateContactInfo` | [ ] | [ ] |
| `MyAccount/User/GitAccess` | [ ] | [ ] |
| `MyAccount/User/Messages` | [ ] | [ ] |
| `MyAccount/User/Messages/EditMessage` | [ ] | [ ] |
| `MyAccount/User/Messages/FindMessage` | [ ] | [ ] |
| `MyAccount/User/Messages/MessageThread` | [ ] | [ ] |
| `MyAccount/User/Messages/MessageThread/SingleMessage` | [ ] | [ ] |
| `MyAccount/User/Notifications` | [ ] | [ ] |
| `MyAccount/User/Request` | [ ] | [ ] |
| `MyAccount/User/Request/EditRequest` | [ ] | [ ] |
| `MyAccount/User/Request/EditRequest/RequestCommentNested` | [ ] | [ ] |
| `MyAccount/User/Request/EditRequest/RequestCommentReply` | [ ] | [ ] |
| `MyAccount/User/Request/EditRequest/RequestCommentUpdate` | [ ] | [ ] |
| `MyAccount/User/Request/MyRequests` | [ ] | [ ] |
| `MyAccount/User/ScheduledFinds` | [ ] | [ ] |
| `MyAccount/User/ScheduledFinds/EditScheduledFind` | [ ] | [ ] |
| `MyAccount/User/Task` | [ ] | [ ] |
| `MyAccount/User/Task/MyTasks` | [ ] | [ ] |
| `MyAccount/User/Task/TaskDetail` | [ ] | [ ] |
| `MyAccount/User/TimeEntries` | [ ] | [ ] |
| `SimpleScreens` | [ ] | [ ] |
| `SimpleScreens/Accounting` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget/BudgetAccountsEntry` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget/BudgetReport` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget/EditBudget` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget/EditBudgetItems` | [ ] | [ ] |
| `SimpleScreens/Accounting/Budget/FindBudget` | [ ] | [ ] |
| `SimpleScreens/Accounting/dashboard` | [ ] | [ ] |
| `SimpleScreens/Accounting/dashboard/OrgInternalSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/FinancialAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/FinancialAccount/EditFinancialAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/FinancialAccount/FinancialAccountStatement` | [ ] | [ ] |
| `SimpleScreens/Accounting/FinancialAccount/FinancialAccountTrans` | [ ] | [ ] |
| `SimpleScreens/Accounting/FinancialAccount/FindFinancialAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/FindJournal` | [ ] | [ ] |
| `SimpleScreens/Accounting/GlAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/GlAccount/EditGlAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/GlAccount/FindGlAccount` | [ ] | [ ] |
| `SimpleScreens/Accounting/GlAccount/GlAccountTree` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/Aging` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/EditInvoice` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/EditInvoiceItemDetails` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/EditInvoiceItemOrders` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/EditInvoiceItems` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/EditInvoiceItemShipments` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/FindInvoice` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/PrintInvoice` | [ ] | [ ] |
| `SimpleScreens/Accounting/Invoice/ReceivableStatement` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/AcctgPreference` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/AssetTypes` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/FinAcctReasons` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/FinAcctTypes` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/GlAccounts` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/InvoiceTypes` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/ItemTypes` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/PaymentInstruments` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/PaymentTypes` | [ ] | [ ] |
| `SimpleScreens/Accounting/OrgSettings/TypeDefaults` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment/BulkPaymentCheck` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment/EditPayment` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment/FindPayment` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment/PaymentCheck` | [ ] | [ ] |
| `SimpleScreens/Accounting/Payment/PaymentDetail` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AccountBalance` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AccountLedger` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/ArAgingSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AssetOnHand` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AssetOnHandSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AssetReceiptTransaction` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AssetStatusByReceipt` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/AssetValuation` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/BalanceSheet` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/CashFlowStatement` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/FinancialRatios` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/IncomeStatement` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/InvoiceAgingDetail` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/InvoiceItemSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/InvoiceReconciliation` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/OrderIssuedInvoiced` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/OrderItemSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/PostedAmountSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/PostedBalanceSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/ReportList` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/RetainedEarningsStatement` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/SalesAnalysis` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/SalesInvoiceAnalysis` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/SalesSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/Reports/ShipmentPackageSummary` | [ ] | [ ] |
| `SimpleScreens/Accounting/TimePeriod` | [ ] | [ ] |
| `SimpleScreens/Accounting/TimePeriod/EditTimePeriod` | [ ] | [ ] |
| `SimpleScreens/Accounting/TimePeriod/FindTimePeriod` | [ ] | [ ] |
| `SimpleScreens/Accounting/TimePeriod/ViewPeriodGlAccounts` | [ ] | [ ] |
| `SimpleScreens/Accounting/Transaction` | [ ] | [ ] |
| `SimpleScreens/Accounting/Transaction/EditTransaction` | [ ] | [ ] |
| `SimpleScreens/Accounting/Transaction/EditTransaction/MoveEntry` | [ ] | [ ] |
| `SimpleScreens/Accounting/Transaction/FindTransaction` | [ ] | [ ] |
| `SimpleScreens/Accounting/Transaction/FindTransactionEntry` | [ ] | [ ] |
| `SimpleScreens/Asset` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetCalendar` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetDetail` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetMaintenance` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetMaintenance/EditAssetMaintenance` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetMaintenance/FindAssetMaintenance` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetMeters` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetParties` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/AssetRegistrations` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/DetailHistory` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/FindAsset` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/FindSummary` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/FindSummary/PhysicalChange` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/FindSummary/PhysicalQuantity` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/MoveAsset` | [ ] | [ ] |
| `SimpleScreens/Asset/Asset/SelectAsset` | [ ] | [ ] |
| `SimpleScreens/Asset/AssetPool` | [ ] | [ ] |
| `SimpleScreens/Asset/AssetPool/EditAssetPool` | [ ] | [ ] |
| `SimpleScreens/Asset/AssetPool/FindAssetPool` | [ ] | [ ] |
| `SimpleScreens/Asset/Container` | [ ] | [ ] |
| `SimpleScreens/Asset/Container/EditContainer` | [ ] | [ ] |
| `SimpleScreens/Asset/Container/FindContainer` | [ ] | [ ] |
| `SimpleScreens/Asset/Container/MoveContainer` | [ ] | [ ] |
| `SimpleScreens/Asset/dashboard` | [ ] | [ ] |
| `SimpleScreens/Asset/EditLots` | [ ] | [ ] |
| `SimpleScreens/Asset/PhysicalInventory` | [ ] | [ ] |
| `SimpleScreens/Asset/PhysicalInventory/EditPhysicalInventory` | [ ] | [ ] |
| `SimpleScreens/Asset/PhysicalInventory/FindPhysicalInventory` | [ ] | [ ] |
| `SimpleScreens/Catalog` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/Content` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/Content/ContentCompare` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/Content/ContentDetail` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/Content/ContentList` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/EditCategory` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/EditProducts` | [ ] | [ ] |
| `SimpleScreens/Catalog/Category/FindCategory` | [ ] | [ ] |
| `SimpleScreens/Catalog/dashboard` | [ ] | [ ] |
| `SimpleScreens/Catalog/Feature` | [ ] | [ ] |
| `SimpleScreens/Catalog/Feature/EditFeature` | [ ] | [ ] |
| `SimpleScreens/Catalog/Feature/FindFeature` | [ ] | [ ] |
| `SimpleScreens/Catalog/FeatureGroup` | [ ] | [ ] |
| `SimpleScreens/Catalog/FeatureGroup/EditFeatureGroup` | [ ] | [ ] |
| `SimpleScreens/Catalog/FeatureGroup/FindFeatureGroup` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/Content` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/Content/ContentCompare` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/Content/ContentDetail` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/Content/ContentList` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/EditAssocs` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/EditCategories` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/EditPrices` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/EditProduct` | [ ] | [ ] |
| `SimpleScreens/Catalog/Product/FindProduct` | [ ] | [ ] |
| `SimpleScreens/Catalog/Search` | [ ] | [ ] |
| `SimpleScreens/Customer` | [ ] | [ ] |
| `SimpleScreens/Customer/CustomerData` | [ ] | [ ] |
| `SimpleScreens/Customer/EditCustomer` | [ ] | [ ] |
| `SimpleScreens/Customer/FindCustomer` | [ ] | [ ] |
| `SimpleScreens/Facility` | [ ] | [ ] |
| `SimpleScreens/Facility/BoxTypes` | [ ] | [ ] |
| `SimpleScreens/Facility/CarrierShipMethods` | [ ] | [ ] |
| `SimpleScreens/Facility/EditFacility` | [ ] | [ ] |
| `SimpleScreens/Facility/EditFacilityLocations` | [ ] | [ ] |
| `SimpleScreens/Facility/EditFacilityProducts` | [ ] | [ ] |
| `SimpleScreens/Facility/FacilityCalendar` | [ ] | [ ] |
| `SimpleScreens/Facility/FindFacility` | [ ] | [ ] |
| `SimpleScreens/Facility/PrintBoxTypes` | [ ] | [ ] |
| `SimpleScreens/Gateway` | [ ] | [ ] |
| `SimpleScreens/Gateway/Payment` | [ ] | [ ] |
| `SimpleScreens/Gateway/Payment/EditPaymentGateway` | [ ] | [ ] |
| `SimpleScreens/Gateway/Payment/FindPaymentGateway` | [ ] | [ ] |
| `SimpleScreens/Gateway/Shipping` | [ ] | [ ] |
| `SimpleScreens/Gateway/Shipping/EditShippingGateway` | [ ] | [ ] |
| `SimpleScreens/Gateway/Shipping/FindShippingGateway` | [ ] | [ ] |
| `SimpleScreens/HumanRes` | [ ] | [ ] |
| `SimpleScreens/HumanRes/dashboard` | [ ] | [ ] |
| `SimpleScreens/HumanRes/EditRateAmounts` | [ ] | [ ] |
| `SimpleScreens/Manufacturing` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/dashboard` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/EditRun` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/FindRun` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunConsumed` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunPickDocument` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunProduced` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunProducts` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunProducts/ConsumeAsset` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunProducts/ConsumeProduct` | [ ] | [ ] |
| `SimpleScreens/Manufacturing/Run/RunProducts/ProduceAsset` | [ ] | [ ] |
| `SimpleScreens/Order` | [ ] | [ ] |
| `SimpleScreens/Order/FindOrder` | [ ] | [ ] |
| `SimpleScreens/Order/OrderDetail` | [ ] | [ ] |
| `SimpleScreens/Order/OrderDetail/EditItem` | [ ] | [ ] |
| `SimpleScreens/Order/OrderDetail/ItemReserve` | [ ] | [ ] |
| `SimpleScreens/Order/OrderDetail/ReturnItem` | [ ] | [ ] |
| `SimpleScreens/Order/OrderItems` | [ ] | [ ] |
| `SimpleScreens/Order/PrintOrder` | [ ] | [ ] |
| `SimpleScreens/Order/QuickItems` | [ ] | [ ] |
| `SimpleScreens/Party` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty/ExpiredContactOther` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty/ExpiredPostal` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty/FindDuplicates` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty/UpdateContactInfo` | [ ] | [ ] |
| `SimpleScreens/Party/EditParty/UpdatePaymentMethodInfo` | [ ] | [ ] |
| `SimpleScreens/Party/FinancialInfo` | [ ] | [ ] |
| `SimpleScreens/Party/FindParty` | [ ] | [ ] |
| `SimpleScreens/Party/PartyAgreements` | [ ] | [ ] |
| `SimpleScreens/Party/PartyAgreements/EditAgreement` | [ ] | [ ] |
| `SimpleScreens/Party/PartyAgreements/FindAgreement` | [ ] | [ ] |
| `SimpleScreens/Party/PartyCalendar` | [ ] | [ ] |
| `SimpleScreens/Party/PartyEmails` | [ ] | [ ] |
| `SimpleScreens/Party/PartyMessages` | [ ] | [ ] |
| `SimpleScreens/Party/PartyProjects` | [ ] | [ ] |
| `SimpleScreens/Party/PartyRelated` | [ ] | [ ] |
| `SimpleScreens/Party/PartyRequests` | [ ] | [ ] |
| `SimpleScreens/Party/PartyTasks` | [ ] | [ ] |
| `SimpleScreens/Party/PartyTimeEntries` | [ ] | [ ] |
| `SimpleScreens/Party/PartyTimeEntries/EditTimeEntry` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/EditPaymentMethod` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/PaymentGatewayResponses` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/PaymentMethodChecks` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/PaymentMethodFiles` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/PaymentMethodTrans` | [ ] | [ ] |
| `SimpleScreens/Party/PaymentMethod/PaymentMethodTrans/CreatePayment` | [ ] | [ ] |
| `SimpleScreens/ProductStore` | [ ] | [ ] |
| `SimpleScreens/ProductStore/EditProductStore` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStore` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStoreCategory` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStoreEmails` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStoreFacility` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStoreParty` | [ ] | [ ] |
| `SimpleScreens/ProductStore/FindProductStoreSettings` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion/EditPromotion` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion/FindPromotion` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion/PromoCode` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion/PromoCode/EditPromoCode` | [ ] | [ ] |
| `SimpleScreens/ProductStore/Promotion/PromoCode/FindPromoCode` | [ ] | [ ] |
| `SimpleScreens/Project` | [ ] | [ ] |
| `SimpleScreens/Project/EditMilestones` | [ ] | [ ] |
| `SimpleScreens/Project/EditProject` | [ ] | [ ] |
| `SimpleScreens/Project/EditRepositories` | [ ] | [ ] |
| `SimpleScreens/Project/EditUsers` | [ ] | [ ] |
| `SimpleScreens/Project/EditWikiPages` | [ ] | [ ] |
| `SimpleScreens/Project/FindProject` | [ ] | [ ] |
| `SimpleScreens/Project/GitCommit` | [ ] | [ ] |
| `SimpleScreens/Project/MilestoneSummary` | [ ] | [ ] |
| `SimpleScreens/Project/ProjectProgressReport` | [ ] | [ ] |
| `SimpleScreens/Project/ProjectSummary` | [ ] | [ ] |
| `SimpleScreens/Project/ProjectTimeEntries` | [ ] | [ ] |
| `SimpleScreens/QuickLookup` | [ ] | [ ] |
| `SimpleScreens/QuickSearch` | [ ] | [ ] |
| `SimpleScreens/Request` | [ ] | [ ] |
| `SimpleScreens/Request/EditRequest` | [ ] | [ ] |
| `SimpleScreens/Request/EditRequest/RequestCommentNested` | [ ] | [ ] |
| `SimpleScreens/Request/EditRequest/RequestCommentReply` | [ ] | [ ] |
| `SimpleScreens/Request/EditRequest/RequestCommentUpdate` | [ ] | [ ] |
| `SimpleScreens/Request/EditRequestItems` | [ ] | [ ] |
| `SimpleScreens/Request/EditTasks` | [ ] | [ ] |
| `SimpleScreens/Request/EditUsers` | [ ] | [ ] |
| `SimpleScreens/Request/EditWikiPages` | [ ] | [ ] |
| `SimpleScreens/Request/FindRequest` | [ ] | [ ] |
| `SimpleScreens/Return` | [ ] | [ ] |
| `SimpleScreens/Return/AddOrderItems` | [ ] | [ ] |
| `SimpleScreens/Return/EditReturn` | [ ] | [ ] |
| `SimpleScreens/Return/EditReturnItems` | [ ] | [ ] |
| `SimpleScreens/Return/FindReturn` | [ ] | [ ] |
| `SimpleScreens/Search` | [ ] | [ ] |
| `SimpleScreens/Shipment` | [ ] | [ ] |
| `SimpleScreens/Shipment/FindShipment` | [ ] | [ ] |
| `SimpleScreens/Shipment/PackageTracking` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentByPackage` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentDetail` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentDetail/ItemReserve` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentDetail/ReceiveItem` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentDetail/UpdateItemAsset` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentInsert` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentItems` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentPack` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentPackages` | [ ] | [ ] |
| `SimpleScreens/Shipment/ShipmentPick` | [ ] | [ ] |
| `SimpleScreens/Shipping` | [ ] | [ ] |
| `SimpleScreens/Shipping/dashboard` | [ ] | [ ] |
| `SimpleScreens/Shipping/PackShipment` | [ ] | [ ] |
| `SimpleScreens/Shipping/PackShipment/PackItems` | [ ] | [ ] |
| `SimpleScreens/Shipping/PackShipment/PackPackages` | [ ] | [ ] |
| `SimpleScreens/Shipping/PackShipment/PackSummary` | [ ] | [ ] |
| `SimpleScreens/Shipping/PackShipment/PackSummary/PackCompleted` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/AddOrder` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/AddShipment` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/BulkPicklist` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/FindPicklist` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/PicklistDetail` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/ShipmentLoadPick` | [ ] | [ ] |
| `SimpleScreens/Shipping/Picklist/ShipmentLoadPickAndPack` | [ ] | [ ] |
| `SimpleScreens/Shipping/PickLocationMoves` | [ ] | [ ] |
| `SimpleScreens/Shipping/PickLocationMoves/QuickMove` | [ ] | [ ] |
| `SimpleScreens/SimpleReport` | [ ] | [ ] |
| `SimpleScreens/SimpleReport/EditReport` | [ ] | [ ] |
| `SimpleScreens/SimpleReport/EditReport/FieldList` | [ ] | [ ] |
| `SimpleScreens/SimpleReport/FindReport` | [ ] | [ ] |
| `SimpleScreens/SimpleReport/QuickViewReport` | [ ] | [ ] |
| `SimpleScreens/SimpleReport/ViewReport` | [ ] | [ ] |
| `SimpleScreens/Supplier` | [ ] | [ ] |
| `SimpleScreens/Supplier/EditSupplier` | [ ] | [ ] |
| `SimpleScreens/Supplier/FindSupplier` | [ ] | [ ] |
| `SimpleScreens/Survey` | [ ] | [ ] |
| `SimpleScreens/Survey/EditSurvey` | [ ] | [ ] |
| `SimpleScreens/Survey/Fields` | [ ] | [ ] |
| `SimpleScreens/Survey/FindSurvey` | [ ] | [ ] |
| `SimpleScreens/Survey/ResponseDetails` | [ ] | [ ] |
| `SimpleScreens/Survey/Responses` | [ ] | [ ] |
| `SimpleScreens/Survey/ResponseStats` | [ ] | [ ] |
| `SimpleScreens/Task` | [ ] | [ ] |
| `SimpleScreens/Task/EditRelated` | [ ] | [ ] |
| `SimpleScreens/Task/EditRequests` | [ ] | [ ] |
| `SimpleScreens/Task/EditSource` | [ ] | [ ] |
| `SimpleScreens/Task/EditTask` | [ ] | [ ] |
| `SimpleScreens/Task/EditTimeEntries` | [ ] | [ ] |
| `SimpleScreens/Task/EditUsers` | [ ] | [ ] |
| `SimpleScreens/Task/EditWikiPages` | [ ] | [ ] |
| `SimpleScreens/Task/FindTask` | [ ] | [ ] |
| `SimpleScreens/Task/TaskSummary` | [ ] | [ ] |
| `SimpleScreens/Task/TaskSummary/TaskCommentNested` | [ ] | [ ] |
| `SimpleScreens/Task/TaskSummary/TaskCommentReply` | [ ] | [ ] |
| `SimpleScreens/Task/TaskSummary/TaskCommentUpdate` | [ ] | [ ] |
| `SimpleScreens/Vendor` | [ ] | [ ] |
| `SimpleScreens/Vendor/EditUsers` | [ ] | [ ] |
| `SimpleScreens/Vendor/EditVendor` | [ ] | [ ] |
| `SimpleScreens/Vendor/FindVendor` | [ ] | [ ] |
| `SimpleScreens/Wiki` | [ ] | [ ] |
| `SimpleScreens/Wiki/EditWikiBlog` | [ ] | [ ] |
| `SimpleScreens/Wiki/EditWikiPage` | [ ] | [ ] |
| `SimpleScreens/Wiki/EditWikiSpace` | [ ] | [ ] |
| `SimpleScreens/Wiki/ViewWikiPage` | [ ] | [ ] |
| `SimpleScreens/Wiki/wiki` | [ ] | [ ] |
| `SimpleScreens/Wiki/wiki/WikiCommentNested` | [ ] | [ ] |
| `SimpleScreens/Wiki/wiki/WikiCommentReply` | [ ] | [ ] |
| `SimpleScreens/Wiki/WikiBlogs` | [ ] | [ ] |
| `SimpleScreens/Wiki/WikiCompare` | [ ] | [ ] |
| `SimpleScreens/Wiki/WikiSpaces` | [ ] | [ ] |
| `ssstatic` | [ ] | [ ] |

## Remaining acceptance work / limits

- In-process specs disable authorization around individual features. Neither those specs nor the explicitly granted browser smoke establish a full production role/organization-isolation/CSRF policy.
- The wiki and content compare screens now render the server-side diff and are covered by a wiki feature in `SimpleScreensRender`; the diff display has not been exercised in a browser. No external diff library remains.
- Shipment scan-receive's native dialog integration is syntax/lint checked, not end-to-end scanned/received in-browser; the available shipment fixture was already ineligible.
- Organization preference mutation and every dialog/AJAX/transition/client widget have not been exhaustively exercised.
- HTML-print content and an actual order PDF are verified, **not pixel/FOP pagination parity or physical check-stock alignment**. CSS retains check/card coordinates and table headings; general FO repeated running regions/page citations are not fully equivalent. Private `component://`/`content://` logo/signature URIs may need browser-resolvable/data URLs. Test every deployed custom print layout and printer.
- The migration is committed and pushed (first pass 2026-10-16, then the commits above), but there is no release or tag; reproducibility rests on the component and the MR-Moqui host at matching revisions. The Git screens need the framework's optional git feature.

## Evidence

The first validation's logs were under `/tmp/mrss-*` and are gone. The 2026-10-23 run: `target/debug/moqui test mantle-usl SimpleScreens` (log `/tmp/mrss-now.log`, not retained), `moqui lint --groovy runtime/component/MrSimpleScreens` and `moqui lint --screens`. Reproduction commands and dependency requirements are in `test/README.md`.
