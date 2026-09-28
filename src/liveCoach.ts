import { Chess, type Move, type Square } from "chess.js";

export type CoachEntry = {
  id: string;
  ply: number;
  role: "coach" | "player";
  kind: "welcome" | "praise" | "improve" | "observe" | "reply" | "hint";
  text: string;
  detail?: string;
  move?: string;
};
export type CoachQuestion = "explain" | "focus";
const names: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export const welcome = (): CoachEntry => ({
  id: crypto.randomUUID(),
  ply: 0,
  role: "coach",
  kind: "welcome",
  text: "I’m watching with you. As you play, I’ll point out good ideas worth repeating and moments where a different move could help. Take your time.",
});
export function uciMove(g: Chess, uci: string): Move | null {
  try {
    return g.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
  } catch {
    return null;
  }
}
function idea(m: Move, before: Chess): string {
  if (m.isKingsideCastle() || m.isQueensideCastle())
    return "castle, relocating your king and bringing your rook toward the center";
  if (m.isPromotion()) return `promote your pawn to a ${names[m.promotion!]}`;
  if (m.captured) return `capture the ${names[m.captured]} on ${m.to}`;
  if (
    ["n", "b"].includes(m.piece) &&
    m.from[1] === (m.color === "w" ? "1" : "8")
  )
    return `develop your ${names[m.piece]} from ${m.from} to ${m.to}`;
  if (m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to))
    return `claim central space with your pawn on ${m.to}`;
  if (before.isAttacked(m.from, m.color === "w" ? "b" : "w"))
    return `move your attacked ${names[m.piece]} from ${m.from} to ${m.to}`;
  return `bring your ${names[m.piece]} to ${m.to}`;
}
// Engine moves guide the theme of a question, never its answer.
function discoveryHint(move: Move | null, before: Chess): string {
  if (!move) return "Before committing, compare your opponent’s strongest replies.";
  if (move.isKingsideCastle() || move.isQueensideCastle())
    return "How could you improve king safety while getting more pieces involved?";
  if (move.isPromotion()) return "Can you help a far-advanced pawn reach its goal safely?";
  if (move.captured) return "Are there any favorable exchanges? Count attackers and defenders, then check the recapture.";
  if (before.isAttacked(move.from, move.color === "w" ? "b" : "w"))
    return "Which of your pieces are under pressure? Compare defending, retreating, and creating a threat.";
  if (["n", "b"].includes(move.piece) && move.from[1] === (move.color === "w" ? "1" : "8"))
    return "Which pieces are still waiting to join the game? Look for useful development that also meets your opponent’s threats.";
  if (move.piece === "p" && ["d4", "e4", "d5", "e5"].includes(move.to))
    return "Could you contest more space in the center? Check what would be left undefended.";
  return "Which piece could become more useful? Compare a couple of plans and check the opponent’s response to each.";
}
function threatHint(response: Move | null): string {
  if (response?.san.endsWith("#")) return "There is an immediate mating threat. Look at the lines toward your king and check its escape squares.";
  if (response?.captured && response.captured !== "p") return "A piece may be vulnerable to capture. Check which pieces are attacked and whether they have enough protection.";
  if (response?.san.includes("+")) return "Your opponent has a forcing check available. Scan the lines toward your king before choosing a plan.";
  return "Check your opponent’s forcing moves: checks, captures, and threats.";
}

/** Remove move-revealing advice saved by earlier versions, retaining played-move history. */
export function hintOnlyEntry(entry: CoachEntry): CoachEntry {
  if (entry.role !== "coach") return entry;
  const clean = (text: string) => text
    .replace(/I’d look at [^.]+\./g, "Compare a couple of ideas, checking your opponent’s strongest replies.")
    .replace(/The engine’s comparison move was [^.]+\. /g, "What other plan could improve your pieces’ activity or safety? ")
    .replace(/After your move, one engine reply is [^.]+\. /g, "Check your opponent’s forcing moves: checks, captures, and threats. ")
    .replace(/They can play [^.]+\. /g, "A piece may be vulnerable. Check your attacked pieces and their defenders. ")
    .replace(/They have checkmate with [^.]+\. /g, "There is an immediate mating threat. Check the lines toward your king. ")
    .replace(/Watch the check [^.]+\. /g, "Look for forcing checks against your king. ");
  return {
    ...entry,
    text: entry.kind === "hint" && entry.text.includes("I’ve marked")
      ? "Compare two candidate moves. For each, look for your opponent’s strongest check, capture, or threat before choosing."
      : clean(entry.text),
    detail: entry.detail ? clean(entry.detail) : undefined,
  };
}
export function moveFeedback({
  before,
  after,
  san,
  loss,
  best,
  reply,
  ply,
  previous = [],
}: {
  before: string;
  after: string;
  san: string;
  loss: number;
  best: string;
  reply?: string;
  ply: number;
  previous: CoachEntry[];
}): Omit<CoachEntry, "id"> {
  const start = new Chess(before);
  const m = start.moves({ verbose: true }).find((m) => m.san === san)!;
  const finish = new Chess(after);
  const alternative = uciMove(new Chess(before), best);
  const response = reply ? uciMove(new Chess(after), reply) : null;
  const repeatDevelopment = previous.some(
    (e) => e.kind === "praise" && e.text.includes("develop"),
  );
  let text: string;
  let kind: CoachEntry["kind"] = "praise";
  if (finish.isCheckmate())
    text = `That’s checkmate! ${san} finishes the game. You found the move that leaves their king without a legal escape.`;
  else if (finish.isDraw() || finish.isStalemate()) {
    kind = "observe";
    text = finish.isStalemate()
      ? `${san} is stalemate: their king isn’t in check, but they have no legal move. That’s a draw—always check for an escape square when you’re trying to finish.`
      : `${san} ends in a drawn position. Let’s carry the useful ideas into your next game.`;
  } else if (loss >= 50) {
    kind = "improve";
    const caution =
      loss >= 150 ? "Let’s pause on" : "There’s a small improvement after";
    text = `${caution} ${san}. `;
    if (response && (response.captured || /[+#]/.test(response.san)))
      text += threatHint(response) + " ";
    else if (
      m.piece === "p" &&
      ((m.to === "f3" && finish.get("g1")?.type === "n") ||
        (m.to === "f6" && finish.get("g8")?.type === "n"))
    )
      text += `Your pawn now occupies ${m.to}, a natural developing square for your knight. `;
    else
      text +=
        "The position gives your opponent more opportunity than the engine’s preferred move. ";
    if (alternative && alternative.san !== san)
      text += discoveryHint(alternative, new Chess(before));
    else
      text += "Before committing, compare your opponent’s strongest replies.";
  } else if (m.isPromotion())
    text = `Nice work getting that pawn through. ${san} turns it into a ${names[m.promotion!]}. Keep looking for chances to escort a passed pawn to promotion.`;
  else if (m.isKingsideCastle() || m.isQueensideCastle())
    text = `I like ${san} here. You’ve brought your king and rook into new positions, and the engine finds no significant drawback. Keep considering castling as part of your development.`;
  else if (
    ply <= 20 &&
    ["n", "b"].includes(m.piece) &&
    m.from[1] === (m.color === "w" ? "1" : "8")
  )
    text = `${repeatDevelopment ? "You’re keeping that development going—nice." : "I like that."} ${san} brings your ${names[m.piece]} off its starting square and develops it into play. Keep getting your pieces involved like this.`;
  else if (m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to))
    text = `I like the central space you’ve claimed with ${san}. That pawn gives you a foothold in the middle. Keep building around it by bringing your knights and bishops into play.`;
  else if (m.captured)
    text = `Good, ${san} picks up their ${names[m.captured]} on ${m.to}, and the engine is happy with the choice. Keep checking the reply after a capture, just as carefully as the capture itself.`;
  else if (m.san.includes("+"))
    text = `I like ${san}: it gives check without a significant evaluation drop in this search. Keep looking for useful forcing moves, then calculate how their king can respond.`;
  else
    text = [
      `I like your choice of ${san}. It holds up well against the engine’s alternatives. Keep taking that moment to check your opponent’s reply.`,
      `${san} looks sound in this position. No significant opportunity was lost in the engine’s short search. Keep weighing your candidate moves before committing.`,
    ][Math.ceil(ply / 2) % 2];
  let detail = `With ${san}, you ${idea(m, new Chess(before))}. `;
  if (alternative)
    detail +=
      alternative.san === san
        ? "That matches the engine’s preferred move in this search. "
        : discoveryHint(alternative, new Chess(before)) + " ";
  if (response) detail += threatHint(response) + " ";
  if (!finish.isGameOver())
    detail += `The estimated difference is ${(loss / 100).toFixed(1)} pawns. This is a short search, so treat it as a starting point for analysis.`;
  return {
    ply,
    role: "coach",
    kind,
    text,
    detail,
    move: `${Math.ceil(ply / 2)}${m.color === "w" ? "." : "…"} ${san}`,
  };
}
export function opponentFeedback(
  m: Move,
  after: string,
  ply: number,
  bot: string,
): Omit<CoachEntry, "id"> | null {
  const g = new Chess(after);
  if (g.isGameOver()) return null;
  if (g.isCheck())
    return {
      ply,
      role: "coach",
      kind: "observe",
      move: `${Math.ceil(ply / 2)}${m.color === "w" ? "." : "…"} ${m.san}`,
      text: `${bot} played ${m.san}—you’re in check. First look for a safe king move, a capture of the checking piece, or a way to block the check. Only legal escapes will be available on the board.`,
    };
  if (m.captured)
    return {
      ply,
      role: "coach",
      kind: "observe",
      move: `${Math.ceil(ply / 2)}${m.color === "w" ? "." : "…"} ${m.san}`,
      text: `${bot} captured your ${names[m.captured]} on ${m.to}. Take a fresh look: can you recapture safely, or is there a stronger threat? Don’t feel you have to take back automatically.`,
    };
  const attacked = g
    .board()
    .flat()
    .filter(
      (p) =>
        p &&
        p.color === g.turn() &&
        p.type !== "k" &&
        p.type !== "p" &&
        g.isAttacked(p.square, m.color) &&
        !g.isAttacked(p.square, g.turn()),
    );
  if (attacked.length) {
    const p = attacked[0]!;
    return {
      ply,
      role: "coach",
      kind: "observe",
      text: `After ${m.san}, your ${names[p.type]} on ${p.square} is attacked with no direct defender. Check whether to move it, defend it, or make a forcing threat of your own.`,
    };
  }
  return null;
}
export function positionFocus(fen: string): string {
  const g = new Chess(fen);
  const color = g.turn();
  const enemy = color === "w" ? "b" : "w";
  if (g.isGameOver())
    return "This game is finished. Look back at a decision you liked and a moment you would approach differently, then try applying that lesson in your next game.";
  if (g.isCheck())
    return "First, get out of check. Compare legal king moves, captures of the attacker, and blocks. Check that your chosen escape does not leave your king attacked.";
  const loose = g
    .board()
    .flat()
    .filter(
      (p) =>
        p &&
        p.color === color &&
        p.type !== "k" &&
        g.isAttacked(p.square, enemy) &&
        !g.isAttacked(p.square, color),
    );
  if (loose.length) {
    const p = loose[0]!;
    return `Start with your ${names[p.type]} on ${p.square}: it is attacked and has no direct defender. Compare moving it, adding a defender, and any forcing checks or captures before deciding.`;
  }
  const home = color === "w" ? "1" : "8";
  const undeveloped = ["b", "c", "f", "g"]
    .map((f) => g.get((f + home) as Square))
    .filter((p) => p?.color === color && ["n", "b"].includes(p.type));
  if (Number(fen.split(" ")[5]) <= 10 && undeveloped.length)
    return `You still have ${undeveloped.length} minor ${undeveloped.length === 1 ? "piece" : "pieces"} on starting squares. Look for a useful knight or bishop move, while checking what your opponent’s last move threatens.`;
  return "Compare two candidate moves. For each one, find your opponent’s strongest check, capture, or threat. If both are sound, prefer the move that gives your least active piece a useful job.";
}
export function trimConversation(entries: CoachEntry[], ply: number) {
  return entries.filter((e) => e.ply <= ply);
}
