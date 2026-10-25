// The order the client specs run in (moqui test-client mr-marble), and the server they run against with --serve:
// mr-mantle and this component with SimpleScreensRender, whose dependsOn brings the eight Mantle flows that make
// orders 55400 and 55401, invoice 55400, payment 55400 and the rest, and ClientAccess, which lets john.doe's ADMIN group
// use the app that test/MoquiConf.xml mounts at apps/SimpleScreens.
suite(["BrowserSmoke", "FindScreens"], {
    server: { components: ["mr-mantle", "mr-marble"], specs: ["SimpleScreensRender", "ClientAccess"] },
})
