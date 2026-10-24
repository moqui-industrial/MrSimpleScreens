// Port of order-role-filters.test.mjs (node:test, node:vm): the two OrgInternal role filters of FindOrder.xml's order
// search, taken from the screen file and evaluated in the real engine (ec.resource.condition, as the entity-find's
// econdition ignore is) for each orderType. Java's !'sales'.equalsIgnoreCase(orderType) ignores the vendor constraint
// except for sales orders; !'purchase'.equalsIgnoreCase(orderType) does the converse, including for Any and empty.
// Run: ./moq test SimpleScreens --spec OrderRoleFilters
const ORDER_TYPES = [undefined, null, "", "Any", "Sales", "SALES", "sales", "Purchase", "PURCHASE", "purchase"]
const FILTERS = [["vendorRoleTypeId", "sales"], ["customerRoleTypeId", "purchase"]]

let xml

spec({
    setupSpec() {
        xml = String(ec.resource.getLocationText("component://SimpleScreens/screen/SimpleScreens/Order/FindOrder.xml") || "")
    },
})

feature("#field: orderType=#shown", {
    where: FILTERS.flatMap(([field, applicableType]) =>
        ORDER_TYPES.map((orderType) => ({ field, applicableType, orderType, shown: String(orderType) }))),
    when({ field }) {
        const expression = (xml.match(new RegExp(`<econdition field-name="${field}" value="OrgInternal" ignore="([^"]+)"`)) || [])[1]
        return { expression }
    },
    then({ expression, applicableType, orderType }) {
        // the role filter is there
        expression != null
        ec.resource.condition(expression, null, { orderType }) == (String(orderType).toLowerCase() !== applicableType)
    },
})
