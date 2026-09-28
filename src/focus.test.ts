import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { observeFocus, summarizeFocus, validFocus, type FocusId } from "./focus.ts";
function observe(fen: string, san: string, focus: FocusId, loss = 0) {
  const game = new Chess(fen); const before = game.fen(); const move = game.move(san);
  return observeFocus(focus, before, game.fen(), move, loss);
}
test("safety notices a resolved threat without claiming to read the player's mind", () => {
  const event = observe("4k2r/8/8/8/8/8/7Q/4K3 w - - 0 1", "Qg2", "safety");
  assert.equal(event?.outcome, "reinforced");
  assert.match(event!.observation, /no longer exposed/);
  assert.doesNotMatch(event!.observation, /noticed|Qg2/);
});
test("safety flags a newly exposed piece with an engine drawback but preserves uncertainty for sacrifices", () => {
  const fen = "4k2r/8/8/8/8/8/6Q1/4K3 w - - 0 1";
  assert.equal(observe(fen, "Qh2", "safety", 500)?.outcome, "revisit");
  assert.equal(observe(fen, "Qh2", "safety", 0)?.outcome, "unclear");
  assert.equal(observe(new Chess().fen(), "e4", "safety"), undefined);
});
test("forced check escapes do not count as a discretionary safety opportunity", () => {
  assert.equal(observe("4k3/8/8/8/8/8/4r3/4K2Q w - - 0 1", "Kxe2", "safety"), undefined);
});
test("development works for both colors and ignores unrelated moves", () => {
  assert.equal(observe(new Chess().fen(), "Nf3", "development")?.outcome, "reinforced");
  const game = new Chess(); game.move("e4");
  assert.equal(observe(game.fen(), "Nf6", "development", 200)?.outcome, "revisit");
  assert.equal(observe(game.fen(), "e5", "development"), undefined);
});
test("center observations use evaluation evidence and do not praise a risky move", () => {
  assert.equal(observe(new Chess().fen(), "e4", "center", 200)?.outcome, "revisit");
  assert.equal(observe(new Chess().fen(), "a3", "center"), undefined);
});
test("summary is derived from retained moves, supporting undo and legacy sessions", () => {
  const event = observe(new Chess().fen(), "Nf3", "development")!;
  const moves = [{ focusEvent: event }];
  assert.equal(summarizeFocus("development", moves).reinforced, 1);
  assert.equal(summarizeFocus("development", moves.slice(0, 0)).events, 0);
  assert.equal(summarizeFocus("center", moves).events, 0);
  assert.match(summarizeFocus("safety", []).summary, /not a pass or a failure/);
  assert.equal(validFocus("safety"), true);
  assert.equal(validFocus("missing"), false);
});
