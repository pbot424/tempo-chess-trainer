import { Chess } from "chess.js";
import type { GameRecord } from "./coach";
import { verifiedGames } from "./progressData.ts";

export type PlacementResult = { level: number; completedAt: string; losses: (number | null)[] };
export type DifficultySettings = { adaptive: boolean; manualLevel?: number; placement?: PlacementResult };
export const placementTasks = [
  { title: "Get your pieces working", prompt: "White to move. Choose an opening move you would be comfortable following up.", fen: new Chess().fen() },
  { title: "Take stock of the threats", prompt: "White to move. Look at what is attacked before deciding on a plan.", fen: "r3k2r/ppp2ppp/2n5/3qp3/3P4/2P2N2/PP2QPPP/R3K2R w KQkq - 0 12" },
  { title: "Make the ending count", prompt: "White to move. Think about king activity and the race to promotion.", fen: "8/5pk1/6p1/3P3p/4K2P/6P1/8/8 w - - 0 35" },
];
export function placementLevel(losses: (number | null)[]) {
  if (losses.length !== placementTasks.length) throw new Error("Complete all placement positions first.");
  const points = losses.reduce<number>((sum, loss) => sum + (loss !== null && Number.isFinite(loss) && loss >= 0 ? loss < 50 ? 2 : loss < 150 ? 1 : 0 : 0), 0);
  // Three positions can suggest a starting challenge, not establish a high rating.
  return points >= 5 ? 2 : points >= 2 ? 1 : 0;
}
export function normalizeDifficulty(value: unknown): DifficultySettings {
  if (!value || typeof value !== "object") return { adaptive: true };
  const settings = value as DifficultySettings;
  const p = settings.placement;
  return { adaptive: typeof settings.adaptive === "boolean" ? settings.adaptive : true,
    ...(Number.isInteger(settings.manualLevel) && settings.manualLevel! >= 0 && settings.manualLevel! <= 5 ? {manualLevel: settings.manualLevel} : {}),
    ...(p && Number.isInteger(p.level) && p.level >= 0 && p.level <= 2 && Number.isFinite(Date.parse(p.completedAt)) && Array.isArray(p.losses) && p.losses.length === 3 ? { placement: p } : {}) };
}
export function recommendDifficulty(records: GameRecord[], placement?: PlacementResult) {
  let level = placement?.level ?? 1;
  let reason = placement ? "Starting from your placement check. Three adaptive games at this level will help refine the recommendation."
    : "Start with Casual, or take the placement check. Three adaptive games at this level will help refine the recommendation.";
  let batch: { win: boolean; loss: boolean; mistakes: number; moves: number }[] = [];
  let lastAdjustment = "";
  const verified = verifiedGames(records).games.reverse();
  for (const { game, moments } of verified) {
    if (game.difficultyMode !== "adaptive" || game.levelIndex !== level || moments.length < 8) continue;
    if (placement && Date.parse(game.date) <= Date.parse(placement.completedAt)) continue;
    batch.push({ win: game.result.startsWith("You win"), loss: game.result === "Resigned" || (!game.result.startsWith("You win") && game.result.includes("wins")), mistakes: moments.filter((m) => m.move.loss >= 150).length, moves: moments.length });
    if (batch.length < 3) continue;
    const wins = batch.filter((g) => g.win).length;
    const losses = batch.filter((g) => g.loss).length;
    const rate = batch.reduce((n,g)=>n+g.mistakes,0) / batch.reduce((n,g)=>n+g.moves,0);
    const oldLevel = level;
    if (wins >= 2 && rate < 0.15) level = Math.min(5, level + 1);
    else if (losses >= 2 && rate >= 0.30) level = Math.max(0, level - 1);
    reason = level > oldLevel ? "You won at least two of three adaptive games while keeping costly moves below 15%. Try one level higher."
      : level < oldLevel ? "Two or more losses and frequent costly moves suggest a gentler challenge. Try one level lower."
      : "Your last three adaptive games suggest keeping this level while you practice.";
    lastAdjustment = game.date;
    batch = [];
  }
  return { level, reason, qualifyingGames: batch.length, lastAdjustment };
}
