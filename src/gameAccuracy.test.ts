import test from "node:test";
import assert from "node:assert/strict";
import { gameAccuracy, moveRating } from "./gameAccuracy.ts";
import type { MoveEvidence } from "./coach";
const moves = (...losses: number[]) => losses.map((loss, i) => ({loss, ply:i * 2 + 1, san:"e4", piece:"p", from:"e2", to:"e4"} as MoveEvidence));
test("empty and invalid evidence never fabricate a score", () => {
  assert.equal(gameAccuracy([]).score, null);
  assert.equal(gameAccuracy(moves(NaN, Infinity, -1)).score, null);
  assert.equal(gameAccuracy(moves(0, NaN)).incomplete, true);
});
test("accuracy is bounded, monotonic, and flags a short sample", () => {
  assert.equal(gameAccuracy(moves(0,0)).score, 100);
  assert.ok(gameAccuracy(moves(50)).score! > gameAccuracy(moves(150)).score!);
  assert.equal(gameAccuracy(moves(10000)).score, 0);
  assert.equal(gameAccuracy(moves(...Array(8).fill(0))).limited, false);
});
test("ratings and key moments use consistent boundaries without mutating history", () => {
  assert.deepEqual([49,50,149,150,299,300].map(moveRating), ["Sound","Inaccuracy","Inaccuracy","Mistake","Mistake","Blunder"]);
  const history=moves(100,400,0,200,500);
  const review=gameAccuracy(history);
  assert.deepEqual(review.counts, {Sound:1,Inaccuracy:1,Mistake:1,Blunder:2});
  assert.deepEqual(review.keyMoments.map(m=>m.ply), [3,7,9]);
  assert.deepEqual(history.map(m=>m.loss), [100,400,0,200,500]);
});
