import { Chess, type Color, type Move, type Square } from "chess.js";

export const focuses = [
  { id: "safety", name: "Notice undefended pieces", prompt: "Before moving, scan for pieces that are attacked and have no direct defender." },
  { id: "development", name: "Bring pieces into play", prompt: "Look for safe ways to bring your knights and bishops off their starting squares." },
  { id: "center", name: "Build a presence in the center", prompt: "Look for useful central pawn moves, then check what changes around them." },
] as const;
export type FocusId = typeof focuses[number]["id"];
export type FocusEvent = {
  focus: FocusId;
  outcome: "reinforced" | "revisit" | "unclear";
  observation: string;
};
export function validFocus(value: unknown): value is FocusId {
  return focuses.some((focus) => focus.id === value);
}
export function focusInfo(id: FocusId) {
  return focuses.find((focus) => focus.id === id)!;
}
export function undefendedAttacked(game: Chess, color: Color): Square[] {
  return game.board().flat().filter((piece) => piece && piece.color === color && piece.type !== "k"
    && game.isAttacked(piece.square, color === "w" ? "b" : "w")
    && !game.isAttacked(piece.square, color)).map((piece) => piece!.square);
}

/** Records observable board changes, not an inference about what the player noticed. */
export function observeFocus(focus: FocusId, beforeFen: string, afterFen: string, move: Move, loss: number): FocusEvent | undefined {
  const before = new Chess(beforeFen);
  const after = new Chess(afterFen);
  if (focus === "safety") {
    if (before.isCheck()) return undefined;
    const previous = undefendedAttacked(before, move.color);
    const current = undefendedAttacked(after, move.color);
    const stillExposed = previous.filter((square) => current.includes(square === move.from ? move.to : square));
    const newlyExposed = current.filter((square) => !previous.includes(square === move.to ? move.from : square));
    if (!previous.length && !newlyExposed.length) return undefined;
    if (previous.length && !stillExposed.length && !newlyExposed.length && loss < 50)
      return { focus, outcome: "reinforced", observation: "Your focus: the attacked, undefended pieces from before your move are no longer exposed that way, and the move holds up in this search. Keep making that safety scan." };
    if (loss >= 150 && (stillExposed.length || newlyExposed.length))
      return { focus, outcome: "revisit", observation: "Your focus: after this move, a piece is attacked with no direct defender, and the engine finds a significant drawback. What changed in its protection?" };
    return { focus, outcome: "unclear", observation: "Your focus: there is an attacked piece without a direct defender. That alone doesn’t prove a mistake—consider forcing moves and compensation before deciding." };
  }
  const developing = ["n", "b"].includes(move.piece) && move.from[1] === (move.color === "w" ? "1" : "8");
  const central = move.piece === "p" && ["d4", "e4", "d5", "e5"].includes(move.to);
  // Only count actual relevant decisions; an unrelated move is not a missed opportunity.
  if (focus === "development" && (!developing || Number(beforeFen.split(" ")[5]) > 10)) return undefined;
  if (focus === "center" && !central) return undefined;
  const subject = focus === "development" ? "bringing a minor piece into play" : "moving a pawn into the center";
  return {
    focus,
    outcome: loss < 50 ? "reinforced" : loss >= 150 ? "revisit" : "unclear",
    observation: loss < 50
      ? `Your focus: ${subject} worked without a significant drawback in this search. Keep pairing that idea with a check of your opponent’s threats.`
      : `Your focus: ${subject} fits your plan, but the move also gave your opponent an opportunity. What did that move leave behind?`,
  };
}
export function summarizeFocus(focus: FocusId, moves: { focusEvent?: FocusEvent }[]) {
  const events = moves.flatMap((move) => move.focusEvent?.focus === focus ? [move.focusEvent] : []);
  const reinforced = events.filter((event) => event.outcome === "reinforced").length;
  const revisit = events.filter((event) => event.outcome === "revisit").length;
  const unclear = events.length - reinforced - revisit;
  const summary = !events.length
    ? "No clear examples of this focus were recorded. That is not a pass or a failure; keep this habit in mind next game."
    : `${events.length} relevant ${events.length === 1 ? "moment" : "moments"}: ${reinforced} supported the habit, ${revisit} worth revisiting${unclear ? `, ${unclear} inconclusive` : ""}. These are board observations, not a measure of what you were thinking.`;
  const next = revisit ? "Revisit one of those moments and try a different idea."
    : reinforced ? "Keep practicing this habit in your next game."
    : "Try another game to collect clearer examples.";
  return { events: events.length, reinforced, revisit, unclear, summary, next };
}
