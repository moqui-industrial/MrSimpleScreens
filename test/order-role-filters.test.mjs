import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const xml = readFileSync(new URL('../screen/SimpleScreens/Order/FindOrder.xml', import.meta.url), 'utf8');

// Java's !'sales'.equalsIgnoreCase(orderType) ignores the vendor constraint except
// for sales orders; !'purchase'.equalsIgnoreCase(orderType) does the converse.
for (const [field, applicableType] of [['vendorRoleTypeId', 'sales'], ['customerRoleTypeId', 'purchase']]) {
    const expression = xml.match(new RegExp(`<econdition field-name="${field}" value="OrgInternal" ignore="([^"]+)"`))?.[1];
    assert.ok(expression, `Missing ${field} role filter`);
    for (const orderType of [undefined, null, '', 'Any', 'Sales', 'SALES', 'sales', 'Purchase', 'PURCHASE', 'purchase']) {
        test(`${field}: orderType=${String(orderType)}`, () => {
            const ignore = runInNewContext(expression, { orderType });
            assert.equal(ignore, String(orderType).toLowerCase() !== applicableType);
        });
    }
}
