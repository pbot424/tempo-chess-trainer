import type { FocusEvent, FocusId } from "./focus";
export type MoveEvidence = {
  beforeFen?: string;
  afterFen?: string;
  focusEvent?: FocusEvent;
  san: string;
  piece: string;
  from: string;
  to: string;
  captured?: string;
  loss: number;
  ply: number;
};
export type GameRecord = {
  difficultyMode?: "adaptive" | "manual";
  levelIndex?: number;
  focus?: FocusId;
  id: string;
  date: string;
  level: string;
  color: "w" | "b";
  result: string;
  pgn: string;
  moves: MoveEvidence[];
};
export function summarize(games: GameRecord[]) {
  const moves = games.flatMap((g) => g.moves);
  const developed = moves.filter(
    (m) =>
      m.ply <= 20 &&
      ["n", "b"].includes(m.piece) &&
      ["1", "8"].includes(m.from[1]),
  ).length;
  const central = moves.filter(
    (m) => m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to),
  ).length;
  const castled = games.filter((g) =>
    g.moves.some((m) => m.san.startsWith("O-O")),
  ).length;
  const mistakes = moves.filter((m) => m.loss >= 150).length;
  const accurate = moves.filter((m) => m.loss < 50).length;
  const checks = moves.filter((m) => /[+#]/.test(m.san)).length;
  const captures = moves.filter((m) => m.captured).length;
  const tendency =
    moves.length < 20
      ? "Still getting to know you"
      : captures / moves.length > 0.24
        ? "An active exchanger"
        : checks / moves.length > 0.12
          ? "An attacking instinct"
          : central >= games.length
            ? "A center-first thinker"
            : "A patient explorer";
  const style = moves.length < 20 ? "Still getting to know you" : games.length < 5 || moves.length < 100 ? `Early tendency: ${tendency.toLowerCase()}` : tendency;
  const safeDeveloped = moves.filter((m) => m.loss < 50 && m.ply <= 20 && ["n", "b"].includes(m.piece) && ["1", "8"].includes(m.from[1])).length;
  const safeCentral = moves.filter((m) => m.loss < 50 && m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to)).length;
  const safeCastled = games.filter((g) => g.moves.some((m) => m.san.startsWith("O-O") && m.loss < 50)).length;
  const strengths = [
    safeDeveloped
      ? `You developed minor pieces early without a significant evaluation loss ${safeDeveloped} times. Keep bringing knights and bishops into play.`
      : "",
    safeCentral
      ? `You claimed central space without a significant evaluation loss ${safeCentral} times. Keep building from the center.`
      : "",
    safeCastled
      ? `You castled without a significant evaluation loss in ${safeCastled} of ${games.length} games. Keep making king safety a habit.`
      : "",
  ].filter(Boolean);
  const focus =
    moves.length < 10
      ? "Play a longer game to give your coach enough context. For now, develop your pieces and check your opponent’s threats."
      : mistakes
        ? `${mistakes} moves lost at least 1.5 pawns of engine evaluation. Before moving, check your opponent’s checks, captures, and threats.`
        : games.some(
              (g) =>
                g.moves.length >= 15 &&
                !g.moves.some((m) => m.san.startsWith("O-O")),
            )
          ? "Your king stayed uncastled in some games. Review king safety and decide when castling is useful."
          : "Keep calculating one move deeper: after your intended move, find your opponent’s strongest reply.";
  return {
    moves: moves.length,
    developed,
    central,
    castled,
    mistakes,
    accurate,
    style,
    strengths,
    focus,
  };
}
export function loadSaved<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
