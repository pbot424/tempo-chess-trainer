import { Chess } from "chess.js";
import type { GameRecord, MoveEvidence } from "./coach";
import { observeFocus } from "./focus.ts";

export type VerifiedMoment = { game: GameRecord; move: MoveEvidence; exposedSetback: boolean };
export function verifiedGames(records: GameRecord[]) {
  const seen = new Set<string>();
  const games: { game: GameRecord; moments: VerifiedMoment[] }[] = [];
  let skipped = 0;
  for (const record of [...records].sort((a,b) => Date.parse(b.date) - Date.parse(a.date))) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    try {
      if (!Number.isFinite(Date.parse(record.date))) throw new Error("Invalid date");
      const g = new Chess(); g.loadPgn(record.pgn);
      const history = g.history({ verbose: true });
      const plies = new Set<number>();
      const moments: VerifiedMoment[] = [];
      for (const move of record.moves) {
        if (plies.has(move.ply)) continue;
        plies.add(move.ply);
        const actual = history[move.ply - 1];
        if (!actual || actual.san !== move.san || actual.color !== record.color || !Number.isFinite(move.loss) || move.loss < 0) { skipped++; continue; }
        moments.push({ game: record, move, exposedSetback: observeFocus("safety", actual.before, actual.after, actual, move.loss)?.outcome === "revisit" });
      }
      if (moments.length) games.push({ game: record, moments });
    } catch { skipped++; }
  }
  return { games, skipped };
}
function windowStats(games: ReturnType<typeof verifiedGames>["games"]) {
  const moments = games.flatMap((g) => g.moments);
  const mistakes = moments.filter((m) => m.move.loss >= 150);
  const exposed = moments.filter((m) => m.exposedSetback);
  return { games: games.length, moves: moments.length, mistakes: mistakes.length, exposed: exposed.length,
    mistakeRate: moments.length ? mistakes.length / moments.length * 100 : null,
    exposedRate: moments.length ? exposed.length / moments.length * 100 : null,
    examples: [...mistakes].sort((a,b) => b.move.loss - a.move.loss).slice(0, 2),
    soundExample: moments.find((m) => m.move.loss < 50),
    from: games.at(-1)?.game.date, to: games[0]?.game.date };
}
export function progressEvidence(records: GameRecord[]) {
  const verified = verifiedGames(records);
  const recent = windowStats(verified.games.slice(0, 5));
  const previous = windowStats(verified.games.slice(5, 10));
  const ready = recent.games === 5 && previous.games === 5 && recent.moves >= 20 && previous.moves >= 20;
  const difference = ready ? recent.mistakeRate! - previous.mistakeRate! : null;
  const direction = difference === null ? "insufficient" : Math.abs(difference) < 5 ? "steady" : difference < 0 ? "improving" : "increasing";
  const headline = direction === "insufficient" ? "Building a fair comparison"
    : direction === "improving" ? "Fewer costly moves in your last five games"
    : direction === "increasing" ? "More costly moves in your last five games"
    : "Your costly-move rate is broadly steady";
  return { recent, previous, ready, difference, direction, headline, skipped: verified.skipped,
    eligibleGames: verified.games.length };
}
