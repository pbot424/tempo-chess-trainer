import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { analyzeAttempt, reviewPosition, type ReviewPosition } from "./review.ts";
function target(moves: string[], ply: number): ReviewPosition {
  const game = new Chess(); moves.forEach((m) => game.move(m));
  return { pgn: game.pgn(), ply, originalSan: moves[ply - 1], originalLoss: 250 };
}
test("review reconstructs either side and never changes the source PGN", () => {
  const t = target(["e4", "e5", "Nf3", "Nc6"], 2);
  const saved = t.pgn;
  const g = reviewPosition(t);
  assert.equal(g.turn(), "b");
  assert.deepEqual(g.history(), ["e4"]);
  g.move("c5");
  assert.equal(t.pgn, saved);
  assert.equal(reviewPosition(t).get("e7")?.type, "p");
  assert.throws(() => reviewPosition({ ...t, ply: 99 }));
  assert.throws(() => reviewPosition({ ...t, originalSan: "a6" }));
});
test("review preserves en passant and castling rights", () => {
  const t = target(["e4", "a6", "e5", "d5", "exd6"], 5);
  assert.ok(reviewPosition(t).moves().includes("exd6"));
  const castle = target(["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "O-O"], 7);
  assert.ok(reviewPosition(castle).moves().includes("O-O"));
});
test("attempts use side-to-move evaluations and hide engine answers", async () => {
  const t = target(["e4", "e5"], 2);
  let n = 0;
  const result = await analyzeAttempt(t, { from: "a7", to: "a6" }, async () => ++n === 1
    ? { move: "c7c5", score: 20 } : { move: "d2d4", score: 140 });
  assert.equal(result.loss, 160);
  assert.doesNotMatch(result.question, /c5|d4|c7|d2/);
  assert.equal(reviewPosition(t).turn(), "b");
});
test("an engine-matching alternative is accepted, and illegal attempts never reach the engine", async () => {
  const t = target(["a3"], 1);
  const result = await analyzeAttempt(t, { from: "e2", to: "e4" }, async () => ({ move: "e2e4", score: 30 }));
  assert.equal(result.loss, 0);
  assert.match(result.verdict, /holds up/);
  await assert.rejects(analyzeAttempt(t, { from: "a1", to: "a8" }, async () => { throw new Error("should not be called"); }), /Invalid move/);
});
test("promotion choices and terminal outcomes are evaluated without requesting an illegal reply", async () => {
  const game = new Chess("7k/P7/6K1/8/8/8/8/8 w - - 0 1");
  game.move("a8=Q");
  const t = { pgn: game.pgn(), ply: 1, originalSan: game.history()[0], originalLoss: 0 };
  const result = await analyzeAttempt(t, { from: "a7", to: "a8", promotion: "n" }, async () => ({ move: "a7a8q", score: 700 }));
  assert.equal(result.san, "a8=N");
  assert.match(result.question, /drawn position/);
});
