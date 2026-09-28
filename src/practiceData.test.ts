import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import type { GameRecord } from "./coach";
import { buildPractice, recordPractice, practiceDue } from "./practiceData.ts";
function record(id: string, sans: string[], losses: number[]): GameRecord {
  const game = new Chess();
  const moves = sans.map((san, i) => {
    const move = game.move(san);
    return { san: move.san, piece: move.piece, from: move.from, to: move.to, loss: losses[i] ?? 0, ply: i + 1 };
  }).filter((_, i) => i % 2 === 0);
  return { id, date: "2026-09-23T00:00:00Z", level: "Casual", color: "w", result: "Resigned", pgn: game.pgn(), moves };
}
test("no exercises are invented when history is empty or a theme has only one example", () => {
  assert.equal(buildPractice([]).exercises.length, 0);
  assert.equal(buildPractice([record("one", ["f3", "e5"], [90])]).exercises.length, 0);
});
test("repeated decisions produce an actual saved position, deduplicated across games", () => {
  const a = record("a", ["f3", "e5"], [90]);
  const b = record("b", ["f3", "d5"], [100]);
  const library = buildPractice([a, b, a]);
  assert.equal(library.exercises.length, 1);
  assert.equal(library.exercises[0].pgn, a.pgn);
  assert.equal(library.exercises[0].originalSan, "f3");
  assert.equal(library.exercises[0].occurrences, 2);
  assert.equal(library.themes.development, 2);
});
test("different themes are not mistaken for recurring mistakes", () => {
  const library = buildPractice([record("a", ["f3", "e5"], [90]), record("b", ["e4", "e5"], [180])]);
  assert.equal(library.exercises.length, 0);
});
test("malformed PGNs and mismatched evidence are excluded", () => {
  const bad = record("a", ["f3"], [90]); bad.moves[0].san = "h4";
  assert.equal(buildPractice([bad]).skipped, 1);
  assert.equal(buildPractice([{ ...bad, pgn: "1. invalid" }]).exercises.length, 0);
});
test("practice tracks distinct ideas, only marks a sound alternative, and schedules recall", () => {
  const a = record("a", ["f3"], [90]);
  const exercise = buildPractice([a, { ...a, id: "b" }]).exercises[0];
  const result = { san: "f3", fen: "", loss: 0, verdict: "", question: "" };
  const now = "2026-09-23T00:00:00Z";
  let progress = recordPractice({}, exercise, result, now);
  assert.equal(progress[exercise.key].solvedAt, undefined);
  progress = recordPractice(progress, exercise, { ...result, san: "e4" }, now);
  progress = recordPractice(progress, exercise, { ...result, san: "e4" }, now);
  assert.equal(Object.keys(progress[exercise.key].attempts).length, 2);
  assert.equal(progress[exercise.key].solvedAt, now);
  assert.equal(practiceDue(progress[exercise.key], Date.parse(now) + 86400000), false);
  assert.equal(practiceDue(progress[exercise.key], Date.parse(now) + 3 * 86400000), true);
  assert.deepEqual(JSON.parse(JSON.stringify(progress)), progress);
});
