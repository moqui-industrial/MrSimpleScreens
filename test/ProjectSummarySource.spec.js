// The source of Project/ProjectSummary.xml: its percents and budget figures are numbers, not BigDecimal method calls
// or decimal conditions, so the qvt render shows them (the progress bars take toNumber(...)/100, the budget conditions
// a toNumber of the difference). Moved here from mr-moqui's screen/tests/decimal.rs, which checks the framework side.
// Run: ./moq test mr-marble --spec ProjectSummarySource
spec({})

feature("ProjectSummary.xml shows its percents and budgets as numbers", {
    when() {
        return { summary: String(ec.resource.getLocationText("component://mr-marble/screen/SimpleScreens/Project/ProjectSummary.xml") || "") }
    },
    then({ summary }) {
        summary.length > 0
        // a percent is no longer divided as a decimal
        !summary.includes("Percent/100")
        // a budget condition is no longer the decimal
        !summary.includes('condition="project.total')
        summary.includes("toNumber(pstats.clientBudgetEstimateDiff)")
    },
})
