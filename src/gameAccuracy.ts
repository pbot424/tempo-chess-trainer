import type { MoveEvidence } from "./coach";

export const moveRatings = ["Sound", "Inaccuracy", "Mistake", "Blunder"] as const;
export function moveRating(loss: number) {
  if (!Number.isFinite(loss) || loss < 0) return "Unrated";
  return loss < 50 ? "Sound" : loss < 150 ? "Inaccuracy" : loss < 300 ? "Mistake" : "Blunder";
}
// Tempo v1: average per-move retention, not Chess.com's CAPS or an Elo estimate.
export function gameAccuracy(moves: MoveEvidence[]) {
  const valid = moves.filter((m) => Number.isFinite(m.loss) && m.loss >= 0);
  const score = valid.length ? Math.round(valid.reduce((sum, m) => sum + 100 * Math.exp(-m.loss / 200), 0) / valid.length) : null;
  const counts = Object.fromEntries(moveRatings.map((rating) => [rating, valid.filter((m) => moveRating(m.loss) === rating).length])) as Record<typeof moveRatings[number], number>;
  const keyMoments = valid.filter((m) => m.loss >= 50).sort((a, b) => b.loss - a.loss || a.ply - b.ply).slice(0, 3).sort((a, b) => a.ply - b.ply);
  return { score, counts, keyMoments, analyzed: valid.length, limited: valid.length < 8, incomplete: valid.length !== moves.length };
}
