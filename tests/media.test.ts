import test from "node:test";
import assert from "node:assert/strict";
import { detectMedia, parseByteRange } from "../src/lib/uploads";

test("byte ranges support iOS suffix, open-ended and clamped playback requests", () => {
  assert.deepEqual(parseByteRange("bytes=-5", 20), { start: 15, end: 19 });
  assert.deepEqual(parseByteRange("bytes=5-", 20), { start: 5, end: 19 });
  assert.deepEqual(parseByteRange("bytes=5-100", 20), { start: 5, end: 19 });
  for (const range of ["bytes=20-", "bytes=8-2", "bytes=-0", "bytes=-", "bytes=0-1,4-5", "bytes=9007199254740992-"]) {
    assert.equal(parseByteRange(range, 20), null);
  }
});

test("media detection rejects executable content regardless of its claimed extension", () => {
  assert.equal(detectMedia(Buffer.from('<html><script>alert(1)</script></html>')), null);
  assert.equal(detectMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.deepEqual(detectMedia(Buffer.from("89504e470d0a1a0a00000000", "hex")), { extension: ".png", type: "IMAGE" });
});
