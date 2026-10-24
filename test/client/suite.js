// The order the client specs run in (moqui test-client SimpleScreens), and the server they run against with --serve:
// mantle-usl and this component with SimpleScreensRender, whose dependsOn brings the eight Mantle flows that make
// orders 55400 and 55401, invoice 55400, payment 55400 and the rest, and ClientAccess, which lets john.doe's ADMIN group
// use the app that test/MoquiConf.xml mounts at apps/SimpleScreens.
suite(["BrowserSmoke", "FindScreens"], {
    server: { components: ["mantle-usl", "SimpleScreens"], specs: ["SimpleScreensRender", "ClientAccess"] },
})
