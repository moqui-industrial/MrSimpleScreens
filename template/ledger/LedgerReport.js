/*
 * This software is in the public domain under CC0 1.0 Universal plus a
 * Grant of Patent License.
 *
 * To the extent possible under law, the author(s) have dedicated all
 * copyright and related and neighboring rights to this software to the
 * public domain worldwide. This software is distributed without any
 * warranty.
 *
 * You should have received a copy of the CC0 Public Domain Dedication
 * along with this software (see the LICENSE.md file). If not, see
 * <http://creativecommons.org/publicdomain/zero/1.0/>.
 */

// Rows for the ledger statements, built from the class info maps of the LedgerReportServices run#* services and shown by
// LedgerTable.html.fancy. The FreeMarker originals walked the class tree with recursive macros and added decimals with
// operators; the fancy dialect has neither, so the table is data made here:
//
//     const ledger = ec.resource.script('component://SimpleScreens/template/ledger/LedgerReport.js')
//     ledgerTable = ledger.table(ec.l10n.localize("Balance Sheet"), headers, rows)
//
// A row is {label, indent (em, or null), strong, rowClass, rowStyle, cells}; a cell is {text, href, pad, cls, italic}.
// Amounts are host decimals; they stay decimals here and are formatted at the end.

const dec = (value) => toDecimal(value ?? 0)
const isZero = (value) => dec(value).isZero()
const multiPeriod = () => (timePeriodIdList?.length ?? 0) > 1
const indentMultiple = () => toNumber(indentMult) ?? 1

// the currencyFormat parameter, else the statement's default: negatives in parentheses for the html balance sheet
// and income statement, plain for the others and for CSV
let defaultCurrencyFormat = '#,##0.00'
const statementFormat = (htmlDefault) => {
    defaultCurrencyFormat = sri.getRenderMode() == 'csv' ? '#,##0.00' : htmlDefault
}
// an amount, with the space the FreeMarker templates put after a non-negative one to line up with "(1.00)"
const money = (amount, format = currencyFormat || defaultCurrencyFormat) => {
    const value = dec(amount)
    return { text: ec.l10n.format(value, format), pad: value.compare(0) >= 0 }
}
// blank for zero
const moneyOrBlank = (amount, format = currencyFormat || defaultCurrencyFormat) => isZero(amount) ? { text: '', pad: true } : money(amount, format)
// amount / base as a percent, blank when either is zero
const percent = (amount, base) => isZero(amount) || isZero(base) ? { text: '', pad: true }
    : { text: ec.l10n.format(dec(amount).divide(base, 10, 'HALF_UP'), percentFormat || '0.0%'), pad: false }
const blank = () => ({ text: '', pad: false })

// the services return the mask (glAccountCodeMask), not a formatter, as their Java versions did
let codeFormatter
const accountLabel = (glAccountInfo) => {
    if (codeFormatter === undefined) codeFormatter = accountCodeFormatter ?? StringUtilities.masker(glAccountCodeMask, '0')
    return (codeFormatter != null ? codeFormatter.valueToString(glAccountInfo.accountCode) : glAccountInfo.accountCode) +
        ': ' + glAccountInfo.accountName
}

// the AccountLedger link of a GL account's amount in a period; `findEntryBase` is sri.buildUrl('accountLedger')
const linked = (cell, findEntryBase, glAccountInfo, timePeriodId) => {
    if (findEntryBase == null) return cell
    cell.href = findEntryBase.cloneUrlInstance().addParameter('glAccountId', glAccountInfo.glAccountId)
        .addParameter('isPosted', 'Y').addParameter('timePeriodId', timePeriodId).getUrlWithParams()
    return cell
}

// a header is text (a right aligned amount column) or {text, cls}
const table = (title, headers, rows, extra) => Object.assign({
    title: title, asOf: ec.l10n.format(ec.user.nowTimestamp, 'dd MMM yyyy HH:mm'),
    headers: headers.map(header => typeof header === 'string' ? { text: header, cls: 'text-right' } : header),
    rows: rows, qvt: sri.getRenderMode() == 'qvt', charts: [] }, extra || {})

// ---- Balance Sheet ----

function balanceSheet(findEntryBase) {
    statementFormat('#,##0.00;(#,##0.00)')
    const showDetail = detail == 'true'
    const showBeginningAndPosted = beginningAndPosted == 'true'
    const showPercents = percents == 'true'
    const mult = indentMultiple()
    const assetTotal = (timePeriodId) => netAssetTotalMap?.totalBalance?.[timePeriodId]
    const rows = []

    const headers = []
    if (showBeginningAndPosted && multiPeriod()) headers.push(ec.l10n.localize('All Periods Posted'))
    for (const timePeriodId of timePeriodIdList) {
        if (showBeginningAndPosted) {
            headers.push(timePeriodIdMap[timePeriodId].periodName + ' ' + ec.l10n.localize('Beginning'),
                ec.l10n.localize('Posted'), ec.l10n.localize('Ending'))
        } else {
            headers.push(timePeriodIdMap[timePeriodId].periodName)
        }
        if (showPercents) headers.push(ec.l10n.localize('% of Assets'))
    }

    const showClass = (classInfo, depth) => {
        // skip classes with no balance
        if (isZero(classInfo.totalBalanceByTimePeriod?.ALL) && isZero(classInfo.totalPostedByTimePeriod?.ALL)) return
        const cells = []
        if (showBeginningAndPosted && multiPeriod()) cells.push(money(classInfo.postedByTimePeriod?.ALL))
        for (const timePeriodId of timePeriodIdList) {
            if (showBeginningAndPosted) {
                cells.push(moneyOrBlank(dec(classInfo.balanceByTimePeriod?.[timePeriodId]).subtract(classInfo.postedByTimePeriod?.[timePeriodId] ?? 0)))
                cells.push(moneyOrBlank(classInfo.postedByTimePeriod?.[timePeriodId]))
            }
            const classPerAmount = classInfo.balanceByTimePeriod?.[timePeriodId]
            cells.push(moneyOrBlank(classPerAmount))
            if (showPercents) cells.push(percent(classPerAmount, assetTotal(timePeriodId)))
        }
        rows.push({ label: ec.l10n.localize(classInfo.className), indent: (depth - 1) * mult + 0.3, cells: cells })

        for (const glAccountInfo of (classInfo.glAccountInfoList ?? [])) {
            if (!showDetail || (isZero(glAccountInfo.balanceByTimePeriod?.ALL) && isZero(glAccountInfo.postedByTimePeriod?.ALL))) continue
            const accountCells = []
            if (showBeginningAndPosted && multiPeriod()) accountCells.push(money(glAccountInfo.postedByTimePeriod?.ALL))
            for (const timePeriodId of timePeriodIdList) {
                if (showBeginningAndPosted) {
                    accountCells.push(money(dec(glAccountInfo.balanceByTimePeriod?.[timePeriodId]).subtract(glAccountInfo.postedByTimePeriod?.[timePeriodId] ?? 0)))
                    accountCells.push(linked(money(glAccountInfo.postedByTimePeriod?.[timePeriodId]), findEntryBase, glAccountInfo, timePeriodId))
                }
                const currentAmt = glAccountInfo.balanceByTimePeriod?.[timePeriodId]
                accountCells.push(linked(money(currentAmt), findEntryBase, glAccountInfo, timePeriodId))
                if (showPercents) accountCells.push(isZero(assetTotal(timePeriodId)) ? blank() : percent(currentAmt, assetTotal(timePeriodId)))
            }
            rows.push({ label: accountLabel(glAccountInfo), indent: (depth - 1) * mult + mult * 1.5 + 0.3, cells: accountCells })
        }

        if (!classInfo.childClassInfoList?.length) return
        for (const childClassInfo of classInfo.childClassInfoList) showClass(childClassInfo, depth + 1)
        const totalCells = []
        if (showBeginningAndPosted && multiPeriod()) totalCells.push(money(classInfo.totalPostedByTimePeriod?.ALL))
        for (const timePeriodId of timePeriodIdList) {
            if (showBeginningAndPosted) {
                totalCells.push(money(dec(classInfo.totalBalanceByTimePeriod?.[timePeriodId]).subtract(classInfo.totalPostedByTimePeriod?.[timePeriodId] ?? 0)))
                totalCells.push(money(classInfo.totalPostedByTimePeriod?.[timePeriodId]))
            }
            const currentAmt = classInfo.totalBalanceByTimePeriod?.[timePeriodId]
            totalCells.push(money(currentAmt))
            if (showPercents) totalCells.push(isZero(assetTotal(timePeriodId)) ? blank() : percent(currentAmt, assetTotal(timePeriodId)))
        }
        rows.push({ label: ec.l10n.localize('Total ' + classInfo.className), indent: (depth - 1) * mult + 0.3, strong: true,
            rowClass: depth == 1 ? 'text-info' : '', rowStyle: depth == 1 ? 'border-bottom:solid black;border-top:solid black;' : '',
            cells: totalCells })
    }

    // a total of balance and posted maps by period, such as equityTotalMap; `parts` are added, as the template did for
    // Liability + Equity + Unbooked Net Income
    const totalRow = (label, rowClass, rowStyle, parts) => {
        const sum = (key, timePeriodId) => parts.reduce((total, part) => total.add(part?.[key]?.[timePeriodId] ?? 0), toDecimal(0))
        const cells = []
        if (showBeginningAndPosted && multiPeriod()) cells.push(money(sum('totalPosted', 'ALL')))
        for (const timePeriodId of timePeriodIdList) {
            if (showBeginningAndPosted) {
                cells.push(money(sum('totalBalance', timePeriodId).subtract(sum('totalPosted', timePeriodId))))
                cells.push(money(sum('totalPosted', timePeriodId)))
            }
            const currentAmt = sum('totalBalance', timePeriodId)
            cells.push(money(currentAmt))
            if (showPercents) cells.push(isZero(assetTotal(timePeriodId)) ? blank() : percent(currentAmt, assetTotal(timePeriodId)))
        }
        rows.push({ label: ec.l10n.localize(label), strong: true, rowClass: rowClass, rowStyle: rowStyle, cells: cells })
    }

    for (const classId of ['ASSET', 'LIABILITY', 'EQUITY', 'DISTRIBUTION']) {
        if (classInfoById?.[classId] != null) showClass(classInfoById[classId], 1)
    }
    if (equityTotalMap != null) totalRow('Total Equity + Distribution', 'text-info', '', [equityTotalMap])
    if (liabilityEquityTotalMap != null) totalRow('Grand Total Liability + Equity', 'text-success', 'border-bottom:solid black;', [liabilityEquityTotalMap])
    totalRow('Unbooked Net Income', 'text-info', '', [netIncomeOut])
    totalRow('Liability + Equity + Unbooked Net Income', 'text-success', 'border-bottom:solid black;', [liabilityEquityTotalMap, netIncomeOut])

    return table((organizationName || '') + ' - ' + ec.l10n.localize('Balance Sheet'), headers, rows)
}

// ---- Income Statement ----

function incomeStatement(findEntryBase) {
    statementFormat('#,##0.00;(#,##0.00)')
    const showDetail = detail == 'true'
    const showCharts = charts == 'true'
    const showDiff = timePeriodIdList.length == 2
    const showPercents = percents == 'true'
    const mult = indentMultiple()
    const netRevenue = (timePeriodId) => classInfoById?.REVENUE?.totalPostedNoClosingByTimePeriod?.[timePeriodId]
    const rows = []

    const headers = []
    if (multiPeriod()) headers.push(ec.l10n.localize('All Periods'))
    for (const timePeriodId of timePeriodIdList) {
        headers.push(timePeriodIdMap[timePeriodId].periodName)
        if (showPercents) headers.push(ec.l10n.localize('% of Revenue'))
    }
    if (showDiff) headers.push(ec.l10n.localize('Difference'))

    // the cells of an amount map by period: All Periods, each period with its percent of revenue, and the difference
    const periodCells = (amounts, negMult, blankZero, linkTo) => {
        const amount = (timePeriodId) => dec(amounts?.[timePeriodId]).multiply(negMult)
        const cells = []
        if (multiPeriod()) cells.push(money(amount('ALL')))
        for (const timePeriodId of timePeriodIdList) {
            const current = amount(timePeriodId)
            const cell = blankZero ? moneyOrBlank(current) : money(current)
            cells.push(linkTo ? linked(cell, findEntryBase, linkTo, timePeriodId) : cell)
            if (showPercents) cells.push(blankZero ? percent(current, netRevenue(timePeriodId))
                : (isZero(netRevenue(timePeriodId)) ? blank() : percent(current, netRevenue(timePeriodId))))
        }
        if (showDiff) cells.push(money(amount(timePeriodIdList[1]).subtract(amount(timePeriodIdList[0]))))
        return cells
    }

    const showClass = (classInfo, depth, showLess) => {
        if (classInfo == null) return
        // skip classes with nothing posted
        if (isZero(classInfo.totalPostedNoClosingByTimePeriod?.ALL)) return
        const negMult = showLess ? -1 : 1
        const less = showLess && depth == 1 ? ' (' + ec.l10n.localize('less') + ')' : ''
        rows.push({ label: ec.l10n.localize(classInfo.className) + less, indent: (depth - 1) * mult + 0.3,
            cells: periodCells(classInfo.postedNoClosingByTimePeriod, negMult, true) })
        for (const glAccountInfo of (classInfo.glAccountInfoList ?? [])) {
            if (!showDetail || isZero(glAccountInfo.postedNoClosingByTimePeriod?.ALL)) continue
            rows.push({ label: accountLabel(glAccountInfo), indent: (depth - 1) * mult + mult * 1.5 + 0.3,
                cells: periodCells(glAccountInfo.postedNoClosingByTimePeriod, negMult, false, glAccountInfo) })
        }
        for (const childClassInfo of (classInfo.childClassInfoList ?? [])) showClass(childClassInfo, depth + 1, showLess)
        if (classInfo.childClassInfoList?.length) {
            rows.push({ label: ec.l10n.localize('Total ' + classInfo.className) + less, indent: (depth - 1) * mult + 0.3, strong: true,
                rowClass: depth == 1 ? 'text-info' : '', cells: periodCells(classInfo.totalPostedNoClosingByTimePeriod, negMult, false) })
        }
    }
    const resultRow = (label, note, amounts) => rows.push({ label: ec.l10n.localize(label), note: note, strong: true,
        rowClass: 'text-success', rowStyle: 'border-bottom: solid black;', cells: periodCells(amounts, 1, false) })

    showClass(classInfoById?.REVENUE, 1, false)
    showClass(classInfoById?.COST_OF_SALES, 1, true)
    resultRow('Gross Profit On Sales', '(' + ec.l10n.localize('Net Revenue') + ' - ' + ec.l10n.localize('Cost of Sales') + ')', grossProfitOnSalesMap)
    showClass(classInfoById?.EXPENSE, 1, true)
    resultRow('Net Operating Income', null, netOperatingIncomeMap)
    showClass(classInfoById?.INCOME, 1, false)
    showClass(classInfoById?.NON_OP_EXPENSE, 1, true)
    resultRow('Net Non-operating Income', null, netNonOperatingIncomeMap)
    resultRow('Net Income', null, netIncomeMap)

    // the expense pie charts: labels and amounts as numbers for Chart.js
    const chartList = []
    if (showCharts) {
        const chartOf = (id, title, topExpenseList) => ({ id: id, title: title,
            config: JSON.stringify({ type: 'pie', data: { labels: topExpenseList.map(it => it.className),
                datasets: [{ data: topExpenseList.map(it => toNumber(it.amount)), backgroundColor: chartColors }] } }) })
        if (multiPeriod() && topExpenseByTimePeriod?.ALL?.length) chartList.push(chartOf('ExpenseChartAll', 'Expenses All Periods', topExpenseByTimePeriod.ALL))
        timePeriodIdList.forEach((timePeriodId, index) => {
            if (topExpenseByTimePeriod?.[timePeriodId]?.length) chartList.push(chartOf('ExpenseChart' + index,
                'Expenses ' + timePeriodIdMap[timePeriodId].periodName, topExpenseByTimePeriod[timePeriodId]))
        })
    }
    return table((organizationName || '') + ' - ' + ec.l10n.localize('Income Statement'), headers, rows,
        { charts: chartList })
}

const chartColors = ['rgba(92, 184, 92, 0.5)', 'rgba(91, 192, 222, 0.5)', 'rgba(240, 173, 78, 0.5)', 'rgba(217, 83, 79, 0.5)',
    'rgba(60, 118, 61, 0.5)', 'rgba(49, 112, 143, 0.5)', 'rgba(138, 109, 59, 0.5)', 'rgba(169, 68, 66, 0.5)',
    'rgba(223, 240, 216, 0.6)', 'rgba(217, 237, 247, 0.6)', 'rgba(252, 248, 227, 0.6)', 'rgba(242, 222, 222, 0.6)']

// ---- Cash Flow and Retained Earnings: posted, beginning and ending of each period ----

// posted, beginning (balance - posted) and ending (balance) of each period, All Periods first when there are several
const postedBeginningEnding = (posted, balance, opts) => {
    const cells = []
    const periods = multiPeriod() ? ['ALL'].concat(timePeriodIdList) : timePeriodIdList
    for (const timePeriodId of periods) {
        const postedCell = money(posted?.[timePeriodId])
        postedCell.pad = false
        if (opts?.linkTo && timePeriodId != 'ALL') linked(postedCell, opts.findEntryBase, opts.linkTo, timePeriodId)
        cells.push(postedCell)
        if (opts?.postedOnly) {
            cells.push(blank(), blank())
        } else {
            const beginning = money(dec(balance?.[timePeriodId]).subtract(posted?.[timePeriodId] ?? 0))
            const ending = money(balance?.[timePeriodId])
            beginning.pad = ending.pad = false
            cells.push(beginning, ending)
        }
    }
    return cells
}
const postedBeginningEndingHeaders = () => {
    const headers = []
    if (multiPeriod()) headers.push(ec.l10n.localize('All Periods Posted'), ec.l10n.localize('Beginning'), ec.l10n.localize('Ending'))
    for (const timePeriodId of timePeriodIdList) headers.push(timePeriodIdMap[timePeriodId].periodName + ' ' + ec.l10n.localize('Posted'),
        ec.l10n.localize('Beginning'), ec.l10n.localize('Ending'))
    return headers
}
// a map by period (such as netIncomeMap) in the Posted columns, the others blank
const postedOnlyCells = (amounts) => postedBeginningEnding(amounts, null, { postedOnly: true })
const sectionRow = (label) => ({ label: ec.l10n.localize(label), strong: true, rowStyle: 'border-top: solid black;',
    cells: postedBeginningEndingHeaders().map(() => blank()) })
// a class's totals: posted, and beginning and ending unless `postedOnly` (the cash flow statement leaves them out)
const classTotalsRow = (classInfo, postedOnly) => ({ label: ec.l10n.localize(classInfo.className), indent: 0.3, strong: true, rowClass: 'text-info',
    cells: postedBeginningEnding(classInfo.totalPostedByTimePeriod, classInfo.totalBalanceByTimePeriod, { postedOnly: postedOnly }) })

function cashFlowStatement(findEntryBase) {
    statementFormat('#,##0.00')
    const showDetail = detail == 'true'
    const rows = []
    const showClass = (classInfo, depth) => {
        if (classInfo == null) return
        // skip classes with nothing posted and no balance
        if (isZero(classInfo.totalBalanceByTimePeriod?.ALL) && isZero(classInfo.totalPostedByTimePeriod?.ALL)) return
        rows.push({ label: ec.l10n.localize(classInfo.className), indent: (depth - 1) * 2 + 0.3,
            cells: postedBeginningEnding(classInfo.postedByTimePeriod, classInfo.balanceByTimePeriod) })
        if (showDetail) for (const glAccountInfo of (classInfo.glAccountInfoList ?? [])) {
            rows.push({ label: accountLabel(glAccountInfo), indent: (depth - 1) * 2 + 3.3,
                cells: postedBeginningEnding(glAccountInfo.postedByTimePeriod, glAccountInfo.balanceByTimePeriod,
                    { linkTo: glAccountInfo, findEntryBase: findEntryBase }) })
        }
        for (const childClassInfo of (classInfo.childClassInfoList ?? [])) showClass(childClassInfo, depth + 1)
        if (classInfo.childClassInfoList?.length) {
            rows.push({ label: ec.l10n.localize(classInfo.className + ' Total'), strong: true, rowClass: depth == 1 ? 'text-info' : '',
                cells: postedBeginningEnding(classInfo.totalPostedByTimePeriod, classInfo.totalBalanceByTimePeriod) })
        }
    }
    const netRow = (label, rowClass, amounts, rowStyle) => rows.push({ label: ec.l10n.localize(label), strong: true, rowClass: rowClass,
        rowStyle: rowStyle || '', cells: postedOnlyCells(amounts) })

    rows.push(sectionRow('Operating Activities'))
    for (const classId of ['REVENUE', 'COST_OF_SALES', 'INCOME', 'EXPENSE', 'NON_OP_EXPENSE']) {
        if (classInfoById?.[classId] != null) rows.push(classTotalsRow(classInfoById[classId], true))
    }
    netRow('Net Income (see details on Income Statement)', 'text-warning', netIncomeMap)
    for (const classId of ['CURRENT_ASSET', 'OTHER_ASSET', 'CURRENT_LIABILITY']) showClass(classInfoById?.[classId], 1)
    netRow('Net Cash Operating Activities', 'text-success', netOperatingActivityMap)
    rows.push(sectionRow('Investing Activities'))
    showClass(classInfoById?.LONG_TERM_ASSET, 1)
    netRow('Net Cash Investing Activities', 'text-success', netInvestingActivityMap)
    rows.push(sectionRow('Financing Activities'))
    for (const classId of ['DISTRIBUTION', 'EQUITY', 'LONG_TERM_LIABILITY']) showClass(classInfoById?.[classId], 1)
    netRow('Net Cash Financing Activities', 'text-success', netFinancingActivityMap)
    const increase = {}
    for (const timePeriodId of ['ALL'].concat(timePeriodIdList)) increase[timePeriodId] = dec(netOperatingActivityMap?.[timePeriodId])
        .add(netInvestingActivityMap?.[timePeriodId] ?? 0).add(netFinancingActivityMap?.[timePeriodId] ?? 0)
    netRow('Net Increase in Cash', 'text-success', increase, 'border-top: solid black;')

    return table(ec.l10n.localize('Cash Flow Statement'), postedBeginningEndingHeaders(), rows, { noDate: true })
}

function retainedEarningsStatement() {
    statementFormat('#,##0.00')
    const rows = []
    const retainedEarningsInfo = classInfoById?.RETAINED_EARNINGS
    const distribution = classInfoById?.DISTRIBUTION
    if (retainedEarningsInfo != null) rows.push(classTotalsRow(retainedEarningsInfo, false))
    rows.push({ label: ec.l10n.localize('Net Income'), strong: true, rowClass: 'text-info', cells: postedOnlyCells(netIncomeMap) })
    if (distribution != null) rows.push(classTotalsRow(distribution, false))
    const netEarnings = {}
    for (const timePeriodId of ['ALL'].concat(timePeriodIdList)) netEarnings[timePeriodId] = dec(netIncomeMap?.[timePeriodId])
        .add(distribution?.totalPostedByTimePeriod?.[timePeriodId] ?? 0)
    rows.push({ label: ec.l10n.localize('Net Earnings'), strong: true, rowClass: 'text-success', cells: postedOnlyCells(netEarnings) })
    // calculated: blank posted, beginning retained earnings, and that plus net earnings
    const calculatedCells = []
    for (const timePeriodId of (multiPeriod() ? ['ALL'] : []).concat(timePeriodIdList)) {
        const beginning = dec(retainedEarningsInfo?.totalBalanceByTimePeriod?.[timePeriodId]).subtract(retainedEarningsInfo?.totalPostedByTimePeriod?.[timePeriodId] ?? 0)
        const beginningCell = money(beginning), endingCell = money(beginning.add(netEarnings[timePeriodId]))
        beginningCell.pad = endingCell.pad = false
        calculatedCells.push(blank(), beginningCell, endingCell)
    }
    rows.push({ label: ec.l10n.localize('Calculated Retained Earnings'), strong: true, rowClass: 'text-success', cells: calculatedCells })
    return table(ec.l10n.localize('Retained Earnings Statement'), postedBeginningEndingHeaders(), rows, { noDate: true })
}

// ---- Financial Ratios ----

function financialRatios() {
    const numFmt = '0.0000'
    const rows = []
    const valueCells = (valueMap, format) => (multiPeriod() ? ['ALL'] : []).concat(timePeriodIdList)
        .map(timePeriodId => ({ text: ec.l10n.format(dec(valueMap?.[timePeriodId]), format), pad: false }))
    const heading = (label) => rows.push({ label: ec.l10n.localize(label), strong: true,
        cells: [blank()].concat((multiPeriod() ? ['ALL'] : []).concat(timePeriodIdList).map(() => blank())) })
    const formula = (...names) => names.map(name => name.startsWith('(') || name.length == 1 ? name : ec.l10n.localize(name)).join(' ')
    const ratio = (label, ratioMap, formulaText) => rows.push({ label: ec.l10n.localize(label),
        cells: [{ text: formulaText, cls: '', italic: true }].concat(valueCells(ratioMap, numFmt)) })
    const other = (label, valueMap) => rows.push({ label: ec.l10n.localize(label),
        cells: [{ text: '', cls: '' }].concat(valueCells(valueMap, currencyFormat || '#,##0.00')) })
    const l = (name) => ec.l10n.localize(name)

    heading('Liquidity')
    ratio('Current Liquidity', currentLiquidityMap, `${l('Current Assets')} / ${l('Current Liabilities')}`)
    ratio('Quick Liquidity', quickLiquidityMap, `(${l('Current Assets')} - ${l('Inventory')}) / ${l('Current Liabilities')}`)
    ratio('Net Working Capital to Total Assets', netCapitalToAssetsMap, `(${l('Current Assets')} - ${l('Inventory')}) / ${l('Total Assets')}`)
    heading('Activity')
    ratio('Inventory Turnover', inventoryTurnoverMap, `${l('Cost of Goods Sold')} / ${l('Inventory')}`)
    ratio('Fixed Asset Turnover', fixedAssetTurnoverMap, `${l('Sales')} / ${l('Net Fixed Assets')}`)
    ratio('Total Assets Turnover', totalAssetsTurnoverMap, `${l('Sales')} / ${l('Total Assets')}`)
    heading('Leverage')
    ratio('Debt Ratio', debtRatioMap, `${l('Total Liabilities')} / ${l('Total Assets')}`)
    ratio('Debt to Equity', debtToEquityMap, `${l('Long Term Debt')} / ${l('Equity')}`)
    ratio('Times Interest Earned', timesInterestEarnedMap, `${l('EBIT')} / ${l('Interest Expense')}`)
    ratio('Cash Coverage', cashCoverageMap, `(${l('EBIT')} + ${l('Depreciation')} + ${l('Amortization')}) / ${l('Interest Expense')}`)
    ratio('Equity Multiplier', equityMultiplierMap, `${l('Total Assets')} / ${l('Equity')}`)
    heading('Profitability')
    ratio('Gross Profit Margin', grossProfitMarginMap, `${l('Gross Profit')} / ${l('Sales')}`)
    ratio('Net Profit Margin', netProfitMarginMap, `${l('Net Income')} / ${l('Sales')}`)
    ratio('Return on Assets', returnOnAssetsMap, `${l('Net Income')} / ${l('Total Assets')}`)
    ratio('Return on Equity', returnOnEquityMap, `${l('Net Income')} / ${l('Equity')}`)
    heading('Metrics')
    other('Net Income', netIncomeMap)
    other('Sales', salesMap)
    other('Gross Profit', grossProfitMap)
    other('EBT (Earnings before Income Taxes)', ebtMap)
    other('IBIE (Income before Interest Expense)', ibieMap)
    other('EBIT (Earnings before Interest and Taxes)', ebitMap)
    heading('GL Class Totals')
    other('Cost of Sales', costOfSalesMap)
    other('Cost of Goods Sold', cogsMap)
    other('Total Assets', totalAssetsMap)
    other('Net Fixed Assets', netFixedAssetsMap)
    other('Inventory', inventoryMap)
    other('Current Assets', currentAssetsMap)
    other('Current Liabilities', currentLiabilitiesMap)
    other('Total Liabilities', totalLiabilitiesMap)
    other('Long Term Debt', longTermDebtMap)
    other('Equity', equityMap)
    other('Accounts Receivable', accountsReceivableMap)
    other('Depreciation', depreciationMap)
    other('Amortization', amortizationMap)
    other('Interest Expense', interestExpenseMap)

    const headers = [{ text: ec.l10n.localize('Formula'), cls: '' }]
        .concat((multiPeriod() ? [ec.l10n.localize('All Periods')] : []).concat(timePeriodIdList.map(id => timePeriodIdMap[id].periodName)))
    return table(ec.l10n.localize('Financial Ratios'), headers, rows, { noDate: true })
}

// ---- CSV of a statement table: the label indented with spaces, then the cell texts ----

function csv(ledgerTable) {
    const quote = (value) => {
        const text = String(value ?? '')
        return /[",\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text
    }
    const lines = [[ledgerTable.title].concat(ledgerTable.headers.map(header => header.text)).map(quote).join(',')]
    for (const row of ledgerTable.rows) {
        const label = ' '.repeat(Math.max(0, Math.round(row.indent ?? 0))) + row.label + (row.note ? ' ' + row.note : '')
        lines.push([label].concat(row.cells.map(cell => cell.text)).map(quote).join(','))
    }
    return lines.join('\n') + '\n'
}

return { balanceSheet, incomeStatement, cashFlowStatement, retainedEarningsStatement, financialRatios, csv, money, table }
