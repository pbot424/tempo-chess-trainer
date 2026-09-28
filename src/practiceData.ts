import { Chess } from "chess.js";
import type { GameRecord } from "./coach";
import { undefendedAttacked } from "./focus.ts";
import type { AttemptResult, ReviewPosition } from "./review";

export const practiceThemes = {
  safety: { title: "Protect your pieces", prompt: "Which pieces are under pressure? Compare their attackers and defenders before choosing your idea." },
  check: { title: "Respond to check", prompt: "Compare captures, blocks, and king escapes. Which options also leave your other pieces safe?" },
  development: { title: "Develop with care", prompt: "Which pieces could do more? Look for useful development, then check the threats your choice allows." },
  center: { title: "Choose central pawn moves", prompt: "How would a pawn move change the center and the lines around your king and pieces?" },
  exchanges: { title: "Look beyond the exchange", prompt: "Count what each side can take, then consider the position after the exchanges. Is there another useful plan?" },
  calculation: { title: "Check the opponent's response", prompt: "Before choosing, compare two ideas and look for the strongest check, capture, or threat against each." },
} as const;
export type PracticeTheme = keyof typeof practiceThemes;
export type Exercise = ReviewPosition & {
  key: string; theme: PracticeTheme; date: string; gameId: string; occurrences: number;
};
export type PracticeRecord = {
  attempts: Record<string, { loss: number; date: string }>;
  solvedAt?: string;
  lastPracticed: string;
};
export type PracticeProgress = Record<string, PracticeRecord>;

export function buildPractice(games: GameRecord[]) {
  const candidates = new Map<string, Exercise>();
  const themeOccurrences = new Map<PracticeTheme, Set<string>>();
  let skipped = 0;
  for (const record of games) {
    try {
      const replay = new Chess(); replay.loadPgn(record.pgn);
      const history = replay.history({ verbose: true });
      for (const evidence of record.moves) {
        if (evidence.loss < 50) continue;
        const move = history[evidence.ply - 1];
        if (!move || move.san !== evidence.san || move.color !== record.color) { skipped++; continue; }
        const before = new Chess(move.before);
        const after = new Chess(move.after);
        const theme: PracticeTheme = before.isCheck() ? "check"
          : undefendedAttacked(after, move.color).length ? "safety"
          : move.captured ? "exchanges"
          : move.piece === "p" && ["d4", "e4", "d5", "e5"].includes(move.to) ? "center"
          : evidence.ply <= 20 && (["n", "b", "q"].includes(move.piece) || (move.piece === "p" && ["f3", "f6"].includes(move.to))) ? "development"
          : "calculation";
        const occurrence = `${record.id}:${evidence.ply}`;
        const occurrences = themeOccurrences.get(theme) ?? new Set<string>();
        if (occurrences.has(occurrence)) continue;
        occurrences.add(occurrence); themeOccurrences.set(theme, occurrences);
        // Same position and original move represent one exercise even across multiple games.
        const key = `${move.before.split(" ").slice(0, 4).join(" ")}|${move.san}`;
        const previous = candidates.get(key);
        if (previous) previous.occurrences++;
        else candidates.set(key, { key, theme, pgn: record.pgn, ply: evidence.ply, originalSan: evidence.san,
          originalLoss: evidence.loss, date: record.date, gameId: record.id, occurrences: 1 });
      }
    } catch { skipped++; }
  }
  const recurring = [...candidates.values()].filter((exercise) => (themeOccurrences.get(exercise.theme)?.size ?? 0) >= 2);
  return { exercises: recurring.sort((a,b) => b.originalLoss - a.originalLoss),
    themes: Object.fromEntries([...themeOccurrences].map(([theme, occurrences]) => [theme, occurrences.size])) as Partial<Record<PracticeTheme, number>>,
    candidateCount: candidates.size, skipped };
}
export function recordPractice(progress: PracticeProgress, exercise: Exercise, result: AttemptResult, now: string): PracticeProgress {
  if (!Number.isFinite(result.loss) || result.loss < 0) return progress;
  const previous = progress[exercise.key];
  const attempts = { ...previous?.attempts };
  const existing = attempts[result.san];
  if (!existing || result.loss < existing.loss) attempts[result.san] = { loss: result.loss, date: now };
  const solved = result.san !== exercise.originalSan && result.loss < 50;
  return { ...progress, [exercise.key]: { attempts, lastPracticed: now,
    solvedAt: solved ? now : previous?.solvedAt } };
}
export function practiceDue(record: PracticeRecord | undefined, now: number) {
  return !record?.solvedAt || now - Date.parse(record.solvedAt) >= 3 * 24 * 60 * 60 * 1000;
}
