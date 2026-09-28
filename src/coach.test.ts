import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, type GameRecord } from "./coach.ts";
import { Chess } from "chess.js";
test("empty profile does not invent achievements", () => {
  const s = summarize([]);
  assert.equal(s.moves, 0);
  assert.equal(s.castled, 0);
  assert.equal(s.style, "Still getting to know you");
});
test("profile aggregates evidence from both colors across games", () => {
  const games: GameRecord[] = [
    {
      id: "a",
      date: "",
      level: "Casual",
      color: "w",
      result: "Resigned",
      pgn: "",
      moves: [
        { san: "e4", piece: "p", from: "e2", to: "e4", loss: 0, ply: 1 },
        { san: "Nf3", piece: "n", from: "g1", to: "f3", loss: 20, ply: 3 },
        { san: "O-O", piece: "k", from: "e1", to: "g1", loss: 170, ply: 9 },
      ],
    },
    {
      id: "b",
      date: "",
      level: "Casual",
      color: "b",
      result: "Resigned",
      pgn: "",
      moves: [
        { san: "Nc6", piece: "n", from: "b8", to: "c6", loss: 30, ply: 4 },
      ],
    },
  ];
  const s = summarize(games);
  assert.equal(s.moves, 4);
  assert.equal(s.developed, 2);
  assert.equal(s.central, 1);
  assert.equal(s.castled, 1);
  assert.equal(s.mistakes, 1);
  assert.equal(s.accurate, 3);
});
test("rules reject illegal moves and recognize checkmate", () => {
  const g = new Chess();
  assert.throws(() => g.move({ from: "e2", to: "e5" }));
  for (const m of ["f3", "e5", "g4", "Qh4#"]) g.move(m);
  assert.equal(g.isCheckmate(), true);
});
test("PGN round trip preserves repetition and undo history", () => {
  const g = new Chess();
  for (const m of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"])
    g.move(m);
  const restored = new Chess();
  restored.loadPgn(g.pgn());
  assert.equal(restored.isThreefoldRepetition(), true);
  restored.undo();
  assert.equal(restored.isThreefoldRepetition(), false);
});
test("promotion offers all four choices and en passant is legal", () => {
  const g = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
  assert.equal(
    g.moves({ square: "a7", verbose: true }).filter((m) => m.promotion).length,
    4,
  );
  const ep = new Chess();
  for (const m of ["e4", "a6", "e5", "d5"]) ep.move(m);
  assert.equal(ep.move("exd6").isEnPassant(), true);
});
test("short games do not receive unsupported castling criticism", () => {
  const g: GameRecord = {
    id: "short",
    date: "",
    level: "Casual",
    color: "w",
    result: "Resigned",
    pgn: "",
    moves: [{ san: "e4", piece: "p", from: "e2", to: "e4", loss: 0, ply: 1 }],
  };
  const s = summarize([g]);
  assert.match(s.focus, /longer game/);
  assert.equal(s.strengths.length, 1);
});
