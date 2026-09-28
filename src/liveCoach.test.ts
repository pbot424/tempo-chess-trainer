import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  moveFeedback,
  opponentFeedback,
  positionFocus,
  trimConversation,
  welcome,
  hintOnlyEntry,
} from "./liveCoach.ts";
function feedback(
  g: Chess,
  san: string,
  best: string,
  loss: number,
  reply?: string,
) {
  const before = g.fen();
  g.move(san);
  return moveFeedback({
    before,
    after: g.fen(),
    san,
    best,
    loss,
    reply,
    ply: g.history().length,
    previous: [],
  });
}
test("praises the actual development idea for white and black", () => {
  const g = new Chess();
  const white = feedback(g, "Nf3", "g1f3", 0, "d7d5");
  assert.equal(white.kind, "praise");
  assert.match(white.text, /knight.*starting square/);
  assert.doesNotMatch(white.detail!, /d5/);
  const black = feedback(g, "Nf6", "g8f6", 0, "d2d4");
  assert.match(black.text, /Nf6/);
  assert.equal(black.move, "1… Nf6");
});
test("a blunder gets a mating-threat clue without revealing either move", () => {
  const g = new Chess();
  g.move("f3");
  g.move("e5");
  const f = feedback(g, "g4", "e2e4", 900, "d8h4");
  assert.equal(f.kind, "improve");
  assert.match(f.text, /mating threat/);
  assert.doesNotMatch(f.text + f.detail, /Qh4|e4|h4/);
  assert.doesNotMatch(f.text, /Keep doing|I like/);
});
test("does not praise development when the move loses material", () => {
  const f = feedback(new Chess(), "Nf3", "e2e4", 200, "e7e5");
  assert.equal(f.kind, "improve");
  assert.doesNotMatch(f.text, /I like that/);
});
test("invalid engine continuation never appears as a recommendation", () => {
  const f = feedback(new Chess(), "e4", "a1a8", 150, "a8a1");
  assert.doesNotMatch(f.text, /a1|a8|capturing/);
  assert.match(f.text, /strongest replies/);
});
test("opponent check prompts an immediate legal-escape focus", () => {
  const g = new Chess();
  for (const m of ["e4", "e5", "f3"]) g.move(m);
  const m = g.move("Qh4+");
  const f = opponentFeedback(m, g.fen(), 4, "Milo");
  assert.match(f!.text, /you’re in check/);
  assert.match(positionFocus(g.fen()), /get out of check/);
});
test("checkmate is celebrated and stalemate is not mistaken for a win", () => {
  const g = new Chess();
  for (const m of ["f3", "e5", "g4"]) g.move(m);
  const f = feedback(g, "Qh4#", "d8h4", 0);
  assert.match(f.text, /checkmate/);
  const stale = new Chess("7k/4Q3/6K1/8/8/8/8/8 w - - 0 1");
  const s = feedback(stale, "Qf7", "e7f7", 0);
  assert.equal(s.kind, "observe");
});
test("undo removes withdrawn move comments and their followups", () => {
  const opening = welcome();
  const entries = [
    opening,
    { ...opening, id: "move", ply: 1 },
    { ...opening, id: "reply", ply: 2 },
    { ...opening, id: "later", ply: 3 },
  ];
  assert.deepEqual(
    trimConversation(entries, 0).map((e) => e.id),
    [opening.id],
  );
  assert.equal(trimConversation(entries, 2).length, 3);
});
test("focus responds to a real undefended attacked piece", () => {
  const g = new Chess("4k3/8/8/8/8/8/4r3/4K2Q w - - 0 1");
  assert.match(positionFocus(g.fen()), /check/);
  assert.match(positionFocus(new Chess().fen()), /4 minor pieces/);
  assert.match(positionFocus("4k2r/8/8/8/8/8/7Q/4K3 w - - 0 1"), /queen on h2/);
});

test("saved advice is migrated without removing the played move", () => {
  const old = { ...welcome(), kind: "improve" as const,
    text: "Let’s pause on c5. They can play Qxc3+, capturing your knight on c3. I’d look at Qd4 here: bring your queen to d4.",
    detail: "With c5, you bring your pawn to c5. The engine’s comparison move was Qd4: bring your queen to d4. After your move, one engine reply is h6. The estimated difference is 5.3 pawns." };
  const migrated = hintOnlyEntry(old);
  assert.match(migrated.detail!, /With c5/);
  assert.doesNotMatch(migrated.text + migrated.detail, /Qd4|d4|Qxc3|h6/);
  assert.deepEqual(hintOnlyEntry(migrated), migrated);
  const hint = hintOnlyEntry({ ...welcome(), kind: "hint", text: "Let’s consider Nf3. I’ve marked g1 and f3 on the board." });
  assert.doesNotMatch(hint.text, /Nf3|g1|f3|marked/);
});
test("development and capture alternatives become conceptual questions", () => {
  const opening = feedback(new Chess(), "a3", "g1f3", 180, "e7e5");
  assert.match(opening.text, /development/);
  assert.doesNotMatch(opening.text + opening.detail, /Nf3|f3|e5/);
  const g = new Chess();
  g.move("e4"); g.move("d5");
  const capture = feedback(g, "a3", "e4d5", 180, "d5e4");
  assert.match(capture.text, /favorable exchanges/);
  assert.doesNotMatch(capture.text + capture.detail, /exd5|dxe4|on d5|to d5/);
});
