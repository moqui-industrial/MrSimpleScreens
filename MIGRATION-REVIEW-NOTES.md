# MrSimpleScreens migration: items for the review pass

Kept by the coordinator while the screen batches run, from the subagents' reports. Each item names the group that found it. Host (MR-Moqui) changes made along the way are listed by file so the review of all mr-moqui changes has one place to start; the commits themselves are the full record.

## Decisions pending

- **Mantle view change (Asset, ast):** `mr-mantle-usl/entity/ProductAssetViewEntities.xml`, `ProductMaintenanceDetail`: `join-optional="true"` on the UOM, PMTR, PMUOM and MTENM joins. With inner joins the "Planned Maintenance" drop-down is empty unless a maintenance has both a UOM and a meter. This is in another repository; confirm it belongs there.
- **Request comment edit (MyAccount):** the Edit button on a nested reply always errors with "Comment N not found on request"; Mantle's `update#RequestComment` only accepts comments joined to the request. Service-contract question.
- **Java parity of `build_url` (Accounting setup, acs):** the Rust `build_url` adds the screen's declared parameters (here `partyId`) to transition URLs, which is how the "Add GL Account" options request got a `partyId` filter. Is that Java behavior? If not, the `parameter-map="{organizationPartyId:'', partyId:''}"` override in `OrgSettings/GlAccounts.xml` is unneeded but harmless.
- **Possible lost edit:** the acs agent ran `git checkout` on `crates/moqui-tui/src/link.rs` to undo its own first attempt (against the no-checkout rule); check that file's diff in the review in case another agent's uncommitted edit was dropped.
- **FinancialRatios total (Accounting Reports, acr):** Total Assets shows -225,404.94 while the Balance Sheet shows 225,283.74; the screen only displays what `run#FinancialRatios` returns. Check in Mantle.
- **`asOfDate` shifts a day (Accounting documents, acd):** `mantle.account.InvoiceServices.get#ReceivableStatementInfo` (mr-mantle-usl) formats its `Date` parameter in the user's time zone; with a US/Central user `asOfDate=2026-10-01` printed as 30 Sep and the aging buckets shifted. Decide how `Date` parameters should reach scripts.
- **`appRoot` is `simple` (acd):** `SimpleScreens.xml` hard-codes `simple` but the suggested mount in `MoquiConf.xml` is `SimpleScreens`; every `//${appRoot}/...` link, including party links, is disabled when mounted as `/apps/SimpleScreens`. Decide the mount name or make appRoot follow the mount.
- **`display text=""` after a link (acd):** FindPayment/EditPayment form-singles show the raw ID because empty text falls back to the field value (as Java's `?has_content`), and the TUI drops the link. Probably the same in Java.

## Host gaps left open

- **Section-iterate inside a form-list cell renders blank in the TUI (Asset):** FindAssetPool Party and Store columns, FindContainer Product column, FindPhysicalInventory Assets column. A nested section writes straight to the output, so it cannot be captured; needs a capture API in the Rust host. (MyAccount's FindMessage worked around it with a joined label.)
- **Row Remove link skips its `confirmation` prompt (MyAccount):** following a row's Remove link with Right in the TUI.
- **`screen-last` after a PhysicalQuantity/PhysicalChange dialog record lands on `/qapps` under `moqui tui --agent` (Asset):** not checked in a real SSH session.
- **File upload fields (MyAccount Add Content, Asset EditAssetMaintenance attachments):** cannot be exercised in the TUI.
- **Test runner:** `moqui test <component> --spec` cannot select a SimpleScreens spec on its own because `dependsOn` is only followed inside one component; the README example fails.
- **Typegen golden fails (Asset, from another agent's `moqui-host.d.ts` edit)** and `golden_tui` was failing from other agents' pending changes; four tui goldens were rewritten with `UPDATE_GOLDEN=1` (`form-list`, `tui-depends`, `tui-dialog`, `tui-dynamics`). Re-check these goldens at the end of the batches.
- **`title=""` headers (acs):** a header like "Delete Button" or "Find Button" still shows the field name in the TUI; the shared `ScreenSupport.js` title helper treats an empty title as absent.
- **TUI `set` on a server-search drop-down inside a list row editor does nothing (acs):** use `focus`, `key F4`, `type`, `key Down`, `key Enter`; `set` works in dialogs. `set Type Fiscal Year` on the multi-select chose Fiscal Bi-Week.
- **Not exercised (acs):** Budget actuals with real postings (red/green container-style), Close Period + Depends, the dashboard Bank Accounts links (need a mount with the Party screens; the HTML render showed them).
- **Mantle messages print epoch millis (acs):** close-period and net-income messages ("ends on 1793404800000") come from mantle-usl services.
- **Upstream-matching oddity (acs):** a GL account config row saved with a null `glAccountId` disappears from the ItemTypes and TypeDefaults lists because their views inner-join `GlAccount`.
- **Lint false positives:** `StringUtilities.masker` (static-class) in 6 acs files; the mask works.
- **Multi-element array with `field_op=in` (acr):** an array in the context fails in `searchFormMap` ("postgres parameters must be scalar values"), while a Set in an econdition `from=` works (ShipmentPackageSummary). `shipmentTypeSet` in Shipment/FindShipment and Shipment/PackageTracking use the Set pattern: recheck them. AccountBalance now passes a comma-joined string.
- **`getGlAccountListPaginated` (template/account) returns "no matches" until a term is typed (acr):** not changed.
- **Missing transitions (acr):** InvoiceReconciliation's lists link to `editShipment` and `assetDetail`, which that screen does not declare; the links render empty.
- **Not exercised in the TUI (acr):** Customer Statement PDF (transition redirects to the `/fop` servlet), Email Export dialogs (would queue a real email), CSV/XML export links (the TUI forces its render mode; BalanceSheet and IncomeStatement CSV checked with a throwaway render spec), Chart.js charts (LedgerCharts.xml, ledger-table pies).
- **Not exercised (acd):** PDF download links (`PaymentCheck.pdf` etc.), email-sending dialogs, Project invoice dialogs (no fixtures), Add Content file upload; the `&nbsp;` label in EditTransaction draws literally in the TUI. Print screens (Invoice, PaymentCheck, PaymentDetail, ReceivableStatement, FinancialAccountStatement) were checked by render test against the original templates, not seen in the TUI.

## Hazards seen in the port

- Groovy-to-JS date and decimal semantics that the batches keep finding: `timestamp - timestamp` is milliseconds in JS (AssetStatusByReceipt days), period dates are UTC midnight so local formatting shows the day before, raw timestamps print as epoch millis, `charAt(0).letter` and decimal `+` need `toDecimal(...).add()`.

- `${x?.y}` on a null renders "undefined" in the JS port; the same may exist in other screens (grep for `?.` in label text and `${}` strings).
- Screens link through `//${appRoot}`; mounting SimpleScreens as `SimpleScreens` makes those links vanish in the TUI where the screens set `appRoot` to another name (Asset scratch mount used `simple`).

## Host files changed by the batches (for the mr-moqui review)

- BasicHandheld batch (committed): `ScreenSupport.js` labelTextExpr, `ScreenTui.js`, `ScreenText.js` (label text-map and condition).
- MyAccount batch (committed): `crates/moqui-core/src/screen/render.rs` (parent pre-actions in the TUI), `crates/moqui-host/src/tui.rs` and `crates/moqui-core/src/user/mod.rs` (session attributes between TUI requests), `crates/moqui-tui/src/model.rs` (`find_mut` reaches list-cell nodes), `ScreenTui.js` (hidden field value, submit text, icon-only labels, fields-not-referenced, `${}` ids).
- Accounting documents batch (acd, uncommitted at writing): `ScreenSupport.js` (`localizedTitle` expands `${}` in TUI/text list headers), `ScreenTui.js` (a link with no text, icon or tooltip is not drawn), `crates/moqui-core/src/screen/urls.rs` (a transition link's context-taken service in-parameters skip maps, lists, entity values and bytes), `crates/moqui-tui/src/session/submit.rs` (the pressed submit's name and text are posted; `tests/dynamic.rs` assertion updated), new host method `ec.entity.getDatabaseConfName(entityName)` (`entity/facade.rs`, `script/runtime.rs`, `script/runtime/entities.rs`, `typegen/moqui-host.d.ts`), goldens `links-labels.js` and typegen expected file.
- Accounting Reports batch (acr, uncommitted at writing): no host or Rust files. New TUI texts: `template/ledger/LedgerReport.js` `tui()` function and new `SalesSummaryTui.js`; regression rows in `test/SimpleScreensRender.spec.js`.
- Accounting setup batch (acs, uncommitted at writing): `ScreenTui.js` (form-single posts the transition service's in-parameters from the context as hidden values; `dynamic-options` `_valueField`/`_labelField` in `optionsParameters`; form-list leaves out a column whose fields all carry a `hide` condition), `crates/moqui-host/src/tui.rs` (reads `_valueField`/`_labelField`), `crates/moqui-tui` `session/mod.rs`, `session/lists.rs`, `link.rs` (Right/Enter on a list row follows the row's first link through `follow_link`, so a confirmation is asked and a transition posts), `crates/moqui-core/src/screen/tests/tui.rs` (two assertions). Shared component file changed: `template/party/PartyTransitions.xml` `getOrgFiscalPeriods` (plain maps, `term` returns one period), guarded by a new feature in `test/SimpleScreensRender.spec.js`.
- Asset batch (uncommitted at writing): `ScreenSupport.js` (`widgetless`, `listFieldHiddenWidget` keep a visible widget plus `<hidden/>` in lists), `ScreenTui.js` (`emitWidget` sections in form-single fields; `emitField` context push/pop around `set` children).
