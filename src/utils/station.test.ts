import assert from "assert";
import {
  parseStation,
  getStationFromSearch,
  lastDisplayedContentKey,
  lastPublicContentKey,
} from "./station";

assert.strictEqual(parseStation(1), 1);
assert.strictEqual(parseStation("2"), 2);
assert.strictEqual(parseStation(" 3 "), 3);
assert.strictEqual(parseStation(0), null);
assert.strictEqual(parseStation(-1), null);
assert.strictEqual(parseStation("abc"), null);
assert.strictEqual(parseStation(null), null);
assert.strictEqual(parseStation(undefined), null);
assert.strictEqual(parseStation(""), null);

assert.strictEqual(getStationFromSearch("?station=2"), 2);
assert.strictEqual(getStationFromSearch("station=3&lang=en"), 3);
assert.strictEqual(getStationFromSearch(new URLSearchParams("station=4")), 4);
assert.strictEqual(getStationFromSearch("?lang=en"), null);
assert.strictEqual(getStationFromSearch(null), null);

assert.strictEqual(lastDisplayedContentKey(2), "lastDisplayedContent:2");
assert.strictEqual(lastPublicContentKey(3), "lastPublicContent:3");

console.log("station.test.ts passed");
