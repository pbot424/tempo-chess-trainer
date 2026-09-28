import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import type { GameRecord } from "./coach";
import { progressEvidence, verifiedGames } from "./progressData.ts";
import { summarize } from "./coach.ts";
function game(index: number, losses: number[], black = false): GameRecord {
  const g = new Chess();
  const sans = ["e4","e5","Nf3","Nc6","Bc4","Nf6","d3","Bc5","O-O","O-O","Nc3","d6"];
  const history = sans.map((san) => g.move(san));
  return { id: `g${index}`, date: new Date(Date.UTC(2026, 8, index + 1)).toISOString(), color: black ? "b" : "w", level:"Casual", result:"Resigned", pgn:g.pgn(),
    moves: history.map((m,i) => ({ san:m.san, piece:m.piece, from:m.from, to:m.to, ply:i+1, loss:losses[Math.floor(i/2)] ?? 0 })).filter((m) => black ? m.ply % 2 === 0 : m.ply % 2 === 1) };
}
test("insufficient history never claims improvement", () => {
  assert.equal(progressEvidence([]).direction, "insufficient");
  assert.equal(progressEvidence([game(0, [200])]).ready, false);
  assert.equal(progressEvidence([game(0, [200])]).recent.mistakes, 1);
  assert.equal(progressEvidence([]).recent.mistakeRate, null);
});
test("ten games use nonoverlapping chronological windows and normalized player-move rates", () => {
  const games = Array.from({length:10}, (_,i) => game(i, i < 5 ? [200,200,200] : [200], i % 2 === 0));
  const result = progressEvidence(games.reverse());
  assert.equal(result.direction,"improving");
  assert.equal(result.recent.games,5);
  assert.equal(result.previous.moves,30);
  assert.equal(result.recent.mistakes,5);
  assert.equal(result.previous.mistakes,15);
  assert.ok(Math.abs(result.difference! + 100/3) < 0.001);
  assert.equal(result.previous.examples[0].game.id,"g4");
  assert.ok(result.recent.examples.every((m) => Number(m.game.id.slice(1)) >= 5));
});
test("worsening and steady outcomes are reported without positive spin", () => {
  assert.equal(progressEvidence(Array.from({length:10},(_,i)=>game(i,i<5?[]:[200,200]))).direction,"increasing");
  assert.equal(progressEvidence(Array.from({length:10},(_,i)=>game(i,[200]))).direction,"steady");
});
test("duplicates, invalid dates, invalid PGNs and mismatched moves are not evidence", () => {
  const good = game(0,[200]);
  const mismatch = game(1,[200]); mismatch.moves[0].san="h4";
  const data=verifiedGames([good,good,mismatch,{...good,id:"broken",pgn:"invalid"},{...good,id:"date",date:"bad"}]);
  assert.equal(data.games.length,2);
  assert.equal(data.games[1].moments.length,6);
  assert.equal(data.skipped,3);
});
test("small move samples do not qualify just because there are ten games", () => {
  const games=Array.from({length:10},(_,i)=>{const g=game(i,[200]);g.moves=g.moves.slice(0,1);return g;});
  assert.equal(progressEvidence(games).ready,false);
});
test("style stays tentative before five games and a hundred moves", () => {
  const many=game(0,[]); many.moves=Array.from({length:30},()=>many.moves[0]);
  assert.match(summarize([many]).style,/Early tendency/);
  assert.match(summarize(Array.from({length:5},(_,i)=>game(i,[]))).style,/Early tendency/);
});
