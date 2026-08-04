import assert from "assert";
import {
  getRouteTemplateKinds,
  mergeEnabledTemplateKinds,
  HEADER_CATALOG_KINDS,
} from "./templateKinds";

// Route → single kind
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/text"), ["text"]);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/image"), ["image"]);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/maps"), ["map"]);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/documents"), [
  "document",
]);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/public"), [
  "publicScroll",
]);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/survey"), ["survey"]);

// Nested paths
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/text/extra"), [
  "text",
]);

// Non-template admin routes
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/upsell"), []);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/settings"), []);
assert.deepStrictEqual(getRouteTemplateKinds("/dashboard/companies/42"), []);

// Route-only: cold start on text page loads one kind
const textOnly = mergeEnabledTemplateKinds({
  routeKinds: getRouteTemplateKinds("/dashboard/text"),
  headerCatalog: false,
});
assert.deepStrictEqual([...textOnly], ["text"]);

// Header catalog adds all searchable kinds (once, deduped with route)
const textWithHeader = mergeEnabledTemplateKinds({
  routeKinds: getRouteTemplateKinds("/dashboard/text"),
  headerCatalog: true,
});
for (const kind of HEADER_CATALOG_KINDS) {
  assert.ok(textWithHeader.has(kind), `missing header kind: ${kind}`);
}
assert.strictEqual(textWithHeader.size, HEADER_CATALOG_KINDS.length);

// Upsell: no route kind until header prefetch
const upsellHeader = mergeEnabledTemplateKinds({
  routeKinds: getRouteTemplateKinds("/dashboard/upsell"),
  headerCatalog: true,
});
assert.strictEqual(upsellHeader.size, HEADER_CATALOG_KINDS.length);

console.log("templateKinds.test.ts: all assertions passed");
