import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { Analysis } from "./engine";
import { moveFeedback, positionFocus } from "./liveCoach.ts";

export type ReviewPosition = {
  pgn: string;
  ply: number;
  originalSan: string;
  originalLoss: number;
};

// Replay the actual history, including castling, en passant and repetition rights.
export function reviewPosition(target: ReviewPosition): Chess {
  const game = new Chess();
  game.loadPgn(target.pgn);
  const history = game.history();
  if (!Number.isInteger(target.ply) || target.ply < 1 || target.ply > history.length || history[target.ply - 1] !== target.originalSan)
    throw new Error("This move could not be found in the saved game.");
  while (game.history().length >= target.ply) game.undo();
  return game;
}

export type AttemptResult = {
  san: string;
  fen: string;
  loss: number;
  verdict: string;
  question: string;
};
export async function analyzeAttempt(
  target: ReviewPosition,
  move: { from: Square; to: Square; promotion?: PieceSymbol },
  analyze: (fen: string) => Promise<Analysis>,
): Promise<AttemptResult> {
  const game = reviewPosition(target);
  const before = game.fen();
  const played = game.move(move);
  const after = game.fen();
  const baseline = await analyze(before);
  const response = game.isGameOver()
    ? { score: game.isCheckmate() ? -10000 : 0, move: "" }
    : await analyze(after);
  const loss = baseline.move === played.from + played.to + (played.promotion ?? "")
    ? 0 : Math.max(0, baseline.score + response.score);
  const feedback = moveFeedback({ before, after, san: played.san, loss,
    best: baseline.move, reply: response.move, ply: target.ply, previous: [] });
  const same = played.san === target.originalSan;
  return {
    san: played.san, fen: after, loss,
    verdict: same ? "You revisited your original move."
      : loss < 50 ? "This idea holds up in the engine’s short search."
      : loss + 50 < target.originalLoss ? "This idea gives up less than your original move in this search."
      : "There’s still something to investigate.",
    question: game.isGameOver() ? feedback.text
      : loss >= 50 ? `${feedback.text} What would you check differently before trying again?`
      : "What does your idea improve, and what is your opponent’s strongest response? Explain it to yourself, then try another idea if you’d like.",
  };
}
export function reviewQuestion(target: ReviewPosition) {
  return positionFocus(reviewPosition(target).fen());
}
