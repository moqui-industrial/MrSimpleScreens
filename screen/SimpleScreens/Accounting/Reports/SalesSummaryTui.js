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

// The Sales Summary stats panels and charts for the terminal (the tui render mode), read from the context SalesSummary.xml
// makes: the same metrics as SalesSummaryStats.html.fancy as one list (this, last, previous and average with the change
// the panels show), and the four charts of SalesSummaryCharts.html.fancy as the client's `chart` component (a table of the
// datasets with a bar for the first series). Each returns an array of nodes for `JSON.stringify` in a `tui` text.
//
//     const salesTui = ec.resource.script('component://mr-marble/screen/SimpleScreens/Accounting/Reports/SalesSummaryTui.js')
//     salesSummaryTui = salesTui.statsNodes(); salesSummaryChartsTui = salesTui.chartNodes()

const dec = (value) => toDecimal(value ?? 0)

// the panel's "x% last" figure: the change from the base as a percent, 0 when there is no base
const changeText = (current, base) => {
    if (dec(base).compare(0) == 0) return '0%'
    const percent = ec.l10n.format(dec(current).subtract(base).abs().divide(base).multiply(100), '00')
    return (dec(current).compare(base) < 0 ? '▼ ' : '▲ ') + percent + '%'
}

const orderStats = [
    ['Order Count', '#,##0', 'orderCount'], ['New Customer Count', '#,##0', 'newCustomerOrderCount'],
    ['New Customer Percent', '0.0%', 'newCustomerPercent'], ['Order Quantity', '#,##0', 'productQuantityTotal'],
    ['Order Product Sales', '$#,##0', 'productSaleTotal'], ['Order Discount Percent', '0.0%', 'discountPercent'],
    ['Order Net Product', '$#,##0', 'netSales'],
]
const invoiceStats = [
    ['Invoice Count', '#,##0', 'invoiceCount'], ['Invoiced Quantity', '#,##0', 'productQuantityTotal'],
    ['Invoices Total', '$#,##0', 'invoiceTotal'], ['Paid Percent', '0.0%', 'paidPercent'],
    ['Pre-Paid Percent', '0.0%', 'prePaidPercent'], ['Invoice Cost Percent', '0.0%', 'costPercent'],
    ['Invoice Discount Percent', '0.0%', 'discountPercent'],
]

function statsNodes() {
    const rows = []
    const addRows = (stats, thisMap, lastMap, priorMap, averageMap) => {
        for (const [title, format, key] of stats) {
            const [valThis, valLast, valPrior, valAvg] = [thisMap, lastMap, priorMap, averageMap].map(map => map?.[key] ?? 0)
            rows.push({ id: title, cells: [title, ec.l10n.format(valThis, format), ec.l10n.format(valLast, format), ec.l10n.format(valPrior, format),
                ec.l10n.format(valAvg, format), changeText(valThis, valLast), changeText(valThis, valAvg), changeText(valLast, valPrior)] })
        }
    }
    addRows(orderStats, ordersThis, ordersLast, ordersPrior, ordersAverage)
    addRows(invoiceStats, invoicesThis, invoicesLast, invoicesPrior, invoicesAverage)

    const columns = [{ title: 'Metric' }].concat(['This', 'Last', 'Previous', 'Average'].map(title => ({ title: title, align: 'right' })),
        ['This vs Last', 'This vs Avg', 'Last vs Prev'].map(title => ({ title: title, align: 'right' })))
    return [
        { t: 'text', id: 'SalesStatsTitle', style: 'h4', text: ec.l10n.localize('Sales Summary Stats') },
        { t: 'formList', id: 'SalesStats', name: 'SalesStats', columns: columns, rows: rows,
            paging: { index: 0, size: Math.max(rows.length, 1), count: rows.length } },
    ]
}

function chartNodes() {
    const chart = (id, title, labels, datasets) => ({ t: 'component', id: id, name: 'chart',
        props: { title: title, labels: labels, series: datasets.map(dataset => ({ name: dataset.label, data: dataset.data })) } })
    return [
        chart('CountSummaryChart', ec.l10n.localize('Orders, New Customers and Invoices'), orderLabelList, countSummaryDatasets),
        chart('OrderAmountChart', ec.l10n.localize('Order Amounts'), orderLabelList, orderAmountsDatasets),
        chart('InvoiceMarginChart', ec.l10n.localize('Invoice Margin'), invoiceLabelList, invoiceMarginDatasets),
        chart('DiscountCostChart', ec.l10n.localize('Discount and Cost Percent'), invoiceLabelList, discountCostDatasets),
    ]
}

return { statsNodes, chartNodes }
