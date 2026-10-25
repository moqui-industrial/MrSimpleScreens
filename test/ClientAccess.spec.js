// Test-only access for the client specs (test/client, moqui test-client mr-marble): the demo user john.doe's
// ADMIN group may use the SimpleScreens app that test/MoquiConf.xml mounts at /apps/SimpleScreens. Its ADMIN
// membership does not reach those screens: SimpleScreens normally relies on the application that mounts it for the
// grant (PopcAdmin's), and its own artifact groups have none. moqui test-client mr-marble --serve runs this spec on
// its server's scratch database (test/client/suite.js); for another server with disposable data run it there:
//     moqui test mr-marble --spec ClientAccess --db existing
// The rows are made only when they are missing. They are not data in data/, so no load of a real database reaches them.

const one = (entity, fields) => {
    let find = ec.entity.find(entity)
    for (const [name, value] of Object.entries(fields)) find = find.condition(name, value)
    return find.one()
}
const ensure = (entity, key, fields) => {
    if (one(entity, key) != null) return
    const row = ec.entity.makeValue(entity)
    row.setFields(Object.assign({}, key, fields || {}), true, null, null)
    row.create()
}

spec({
    setupSpec() {
        ec.artifactExecution.disableAuthz()
        try {
            ensure("moqui.security.ArtifactGroup", { artifactGroupId: "MRSS_TEST_APP" },
                { description: "SimpleScreens app at /apps/SimpleScreens (client tests only)" })
            ensure("moqui.security.ArtifactGroupMember",
                { artifactGroupId: "MRSS_TEST_APP", artifactName: "component://mr-marble/screen/SimpleScreens.xml",
                    artifactTypeEnumId: "AT_XML_SCREEN" },
                { nameIsPattern: "N", inheritAuthz: "Y" })
            ensure("moqui.security.ArtifactAuthz", { artifactAuthzId: "MRSS_TEST_APP_ADMIN" },
                { userGroupId: "ADMIN", artifactGroupId: "MRSS_TEST_APP", authzTypeEnumId: "AUTHZT_ALWAYS", authzActionEnumId: "AUTHZA_ALL" })
        } finally {
            ec.artifactExecution.enableAuthz()
        }
    },
})

feature("ADMIN, the group of john.doe, may use the SimpleScreens app", {
    when() {
        ec.artifactExecution.disableAuthz()
        try {
            return {
                member: one("moqui.security.ArtifactGroupMember", { artifactGroupId: "MRSS_TEST_APP",
                    artifactName: "component://mr-marble/screen/SimpleScreens.xml", artifactTypeEnumId: "AT_XML_SCREEN" }),
                authz: one("moqui.security.ArtifactAuthz", { artifactAuthzId: "MRSS_TEST_APP_ADMIN" }),
                admin: ec.entity.find("moqui.security.UserGroupMember").condition("userId", "EX_JOHN_DOE")
                    .condition("userGroupId", "ADMIN").count(),
            }
        } finally {
            ec.artifactExecution.enableAuthz()
        }
    },
    then({ member, authz, admin }) {
        member.inheritAuthz == "Y"
        authz.userGroupId == "ADMIN"
        authz.authzActionEnumId == "AUTHZA_ALL"
        admin > 0
    },
})
