// Port of the CDP smoke browser-smoke.mjs (plans/ClientTestHarness.md 9): pages of the flow data as john.doe in
// headless Chromium, each with the text it must show, and PrintOrder with its SVG barcode bars and a PDF. Page
// problems (uncaught exceptions, console errors, failed responses, render errors) fail each row. The PDF and a
// screenshot of PrintOrder go to the output directory; reading the PDF's text (pdftotext) was a manual step and is
// not ported.
// Run: moqui test-client SimpleScreens --serve --spec BrowserSmoke
const user = params.user ?? "john.doe"
const password = params.password ?? "moqui"

// the REST login of the default session: the credentials work before any browser starts
spec({ setupSpec() { login(user, password) } })

feature("#path shows #text", {
    where: [
        { path: "/apps/SimpleScreens/Customer/FindCustomer?pseudoId=CustJqp", text: "Joe" },
        { path: "/apps/SimpleScreens/Order/OrderDetail?orderId=55401", text: "Picker Bot 2000" },
        { path: "/apps/SimpleScreens/Accounting/Invoice/EditInvoice?invoiceId=55400", text: "Payment Sent" },
        { path: "/apps/SimpleScreens/Accounting/Payment/EditPayment?paymentId=55400", text: "Delivered" },
        { path: "/apps/my/User/Account", text: "Change Password" },
    ],
    expect({ path, text }) {
        const page = browser.newPage({ user, password })
        page.goto(path).status == 200
        const body = page.text()
        body.includes(text)
        !/Error rendering section|Exception in render/.test(body)
    },
})

feature("PrintOrder renders barcodes and prints a PDF", {
    expect() {
        const page = browser.newPage({ user, password })
        page.goto("/apps/SimpleScreens/Order/PrintOrder.html-print?orderId=55400").status == 200
        page.text().includes("23,795.00")
        // real barcode SVG bars
        page.locator("svg rect").count() > 0
        const pdf = page.pdf("PrintOrder-55400")
        pdf.magic == "%PDF"
        pdf.size > 1000
        page.screenshot("PrintOrder-55400", { fullPage: true })
    },
})
