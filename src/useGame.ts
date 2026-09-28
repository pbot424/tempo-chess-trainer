import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { engine } from "./engine";
import { loadSaved, save, type GameRecord, type MoveEvidence } from "./coach";
import {
  welcome,
  hintOnlyEntry,
  moveFeedback,
  opponentFeedback,
  positionFocus,
  trimConversation,
  type CoachEntry,
  type CoachQuestion,
} from "./liveCoach";
import { focusInfo, observeFocus, summarizeFocus, validFocus, type FocusId } from "./focus";
export const levels = [
  { name: "New to chess", elo: 400, bot: "Pip", skill: 0, random: 0.65 },
  { name: "Casual", elo: 800, bot: "Milo", skill: 2, random: 0.3 },
  { name: "Intermediate", elo: 1200, bot: "Sage", skill: 5, random: 0.08 },
  { name: "Advanced", elo: 1600, bot: "Felix", skill: 9, random: 0 },
  { name: "Expert", elo: 2000, bot: "Ada", skill: 15, random: 0 },
  { name: "Master", elo: 2400, bot: "Atlas", skill: 20, random: 0 },
];
type Session = {
  difficultyMode?: "adaptive" | "manual";
  focus?: FocusId | null;
  pgn: string;
  active: boolean;
  color: "w" | "b";
  level: number;
  evidence: MoveEvidence[];
  id: string;
  result: string;
  conversation?: CoachEntry[];
};
export function useGame() {
  const [initial] = useState(() =>
    loadSaved<Session | null>("tempo-session", null),
  );
  const game = useRef(new Chess());
  const initialized = useRef(false);
  if (!initialized.current) {
    try {
      if (initial?.pgn) game.current.loadPgn(initial.pgn);
    } catch {
      /* invalid saved game starts fresh */
    }
    initialized.current = true;
  }
  const [fen, setFen] = useState(game.current.fen());
  const [active, setActive] = useState(initial?.active ?? false);
  const [color, setColor] = useState<"w" | "b">(initial?.color ?? "w");
  const [difficultyMode, setDifficultyMode] = useState<"adaptive" | "manual">(initial?.difficultyMode === "adaptive" ? "adaptive" : "manual");
  const [focus, setFocus] = useState<FocusId | null>(validFocus(initial?.focus) ? initial.focus : null);
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [records, setRecords] = useState<GameRecord[]>(() =>
    loadSaved("tempo-games", []),
  );
  const [evidence, setEvidence] = useState<MoveEvidence[]>(
    initial?.evidence ?? [],
  );
  const [id, setId] = useState(initial?.id ?? crypto.randomUUID());
  const [result, setResult] = useState(initial?.result ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<CoachEntry[]>(
    () =>
      initial?.conversation?.map(hintOnlyEntry) ??
      (initial?.result
        ? [
            {
              ...welcome(),
              text: "Your game is saved. Detailed live comments will follow your moves in the next game.",
            },
          ]
        : initial?.active
          ? [welcome()]
          : []),
  );
  useEffect(() => { setConversation((entries) => entries.map(hintOnlyEntry)); }, []);
  // Presentation state is deliberately not saved: restored messages are already readable.
  const [pendingStreams, setPendingStreams] = useState<string[]>([]);
  const finishStream = useCallback((id: string) => {
    setPendingStreams((ids) => ids.filter((pending) => pending !== id));
  }, []);
  const streamingIds = pendingStreams.filter((id) => conversation.some((entry) => entry.id === id));
  function addComment(entry: Omit<CoachEntry, "id">) {
    const id = crypto.randomUUID();
    setConversation((old) => [...old, { ...entry, id }]);
    setPendingStreams((ids) => [...ids, id]);
  }
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachError, setCoachError] = useState("");
  const coachRequest = useRef<{id:number; controller:AbortController | null}>({id:0,controller:null});
  function cancelCoach(reason = "Reply stopped. Your question is still in the text box.") {
    if (coachRequest.current.controller) {
      const controller = coachRequest.current.controller;
      coachRequest.current.controller = null;
      coachRequest.current.id++;
      setCoachBusy(false);
      setCoachError(reason);
      controller.abort();
    }
  }
  useEffect(() => () => { coachRequest.current.controller?.abort(); }, []);
  async function askConversational(question: string) {
    if (busy || coachBusy || !question.trim() || question.length > 1200) return false;
    const requestId = ++coachRequest.current.id;
    const controller = new AbortController(); coachRequest.current.controller = controller;
    const ply = game.current.history().length;
    setCoachBusy(true); setCoachError("");
    const last = conversation.at(-1);
    if (last?.role !== "player" || last.text !== question || last.ply !== ply)
      setConversation((old) => [...old, {id:crypto.randomUUID(),ply,role:"player",kind:"reply",text:question}]);
    const timer = window.setTimeout(() => controller.abort(), 95000);
    try {
      const response = await fetch('/api/coach', {method:'POST', headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({question,pgn:game.current.pgn(),color,focus,finished:!!result,
          evidence:evidence.slice(-6),conversation:conversation.slice(-12).map(({role,text})=>({role,text}))})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The coach could not answer. Try again.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The coach returned an empty reply. Try again.");
      if (requestId !== coachRequest.current.id) return false;
      addComment({ply,role:"coach",kind:"reply",text:data.reply});
      return true;
    } catch (err) {
      if (requestId === coachRequest.current.id) setCoachError(controller.signal.aborted ? "The coach took too long. Your question is still here; try again." : (err as Error).message);
      return false;
    } finally {
      window.clearTimeout(timer);
      if (requestId === coachRequest.current.id) {coachRequest.current.controller=null;setCoachBusy(false);}
    }
  }
  function askCoach(question: CoachQuestion) {
    if (busy || coachBusy || streamingIds.length) return;
    const ply = game.current.history().length;
    const latest = [...conversation]
      .reverse()
      .find((e) => e.role === "coach" && e.detail);
    const text =
      question === "explain"
        ? (latest ? hintOnlyEntry(latest).detail! :
          "Make a move first and I’ll explain what I notice about it. For now, look for ways to control the center and develop your pieces.")
        : result
          ? "This game is finished. Look back at one decision you liked and one you would change. You can review your game insights or start another game to practice that idea."
          : positionFocus(game.current.fen());
    const replyId = crypto.randomUUID();
    setPendingStreams((ids) => [...ids, replyId]);
    setConversation((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        ply,
        role: "player",
        kind: "reply",
        text:
          question === "explain"
            ? "Explain that move."
            : "What should I look for?",
      },
      { id: replyId, ply, role: "coach", kind: "reply", text },
    ]);
  }
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const botRunning = useRef(false);
  useEffect(() => {
    if (
      !save("tempo-session", {
        pgn: game.current.pgn(),
        active,
        color,
        level,
        evidence,
        id,
        result,
        conversation,
        focus,
        difficultyMode,
      })
    )
      setError("Browser storage is full. This session cannot be saved.");
  }, [fen, active, color, level, evidence, id, result, conversation, focus, difficultyMode]);
  function finish(label: string, ev = evidence) {
    cancelCoach("The game finished. Ask again to discuss the completed game.");
    setActive(false);
    setResult(label);
    const record: GameRecord = {
      id,
      date: new Date().toISOString(),
      level: levels[level].name,
      color,
      result: label,
      pgn: game.current.pgn(),
      moves: ev,
      focus: focus ?? undefined,
      difficultyMode,
      levelIndex: level,
    };
    setRecords((old) => {
      const next = [record, ...old.filter((g) => g.id !== id)];
      if (!save("tempo-games", next))
        setError("Could not save game history. Browser storage is full.");
      return next;
    });
  }
  function checkEnd(ev = evidence) {
    if (game.current.isGameOver()) {
      const g = game.current;
      finish(
        g.isCheckmate()
          ? g.turn() === color
            ? levels[level].bot + " wins — checkmate"
            : "You win — checkmate"
          : g.isStalemate()
            ? "Draw — stalemate"
            : "Draw — " +
              (g.isThreefoldRepetition()
                ? "threefold repetition"
                : g.isInsufficientMaterial()
                  ? "insufficient material"
                  : "fifty-move rule"),
        ev,
      );
      return true;
    }
    return false;
  }
  async function bot() {
    if (botRunning.current) return;
    botRunning.current = true;
    setBusy(true);
    const gen = generation.current;
    const position = game.current.fen();
    try {
      const config = levels[level];
      const analysis = await engine.analyze(position, config.skill, 350);
      if (gen !== generation.current) return;
      const legal = game.current.moves({ verbose: true });
      if (!legal.length) return;
      const move =
        Math.random() < config.random
          ? legal[Math.floor(Math.random() * legal.length)]
          : {
              from: analysis.move.slice(0, 2),
              to: analysis.move.slice(2, 4),
              promotion: analysis.move[4],
            };
      const played = game.current.move(move);
      const observation = opponentFeedback(
        played,
        game.current.fen(),
        game.current.history().length,
        config.bot,
      );
      if (observation) addComment(observation);
      setFen(game.current.fen());
      checkEnd();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      botRunning.current = false;
      if (gen === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (active && game.current.turn() !== color && !busy && !error) void bot();
  }, [fen, active, color, busy, error]);
  function start(l: number, c: "w" | "b", chosenFocus: FocusId = "safety", mode: "adaptive" | "manual" = "manual") {
    cancelCoach();
    setCoachError("");
    generation.current++;
    game.current = new Chess();
    setFen(game.current.fen());
    setActive(true);
    setLevel(l);
    setDifficultyMode(mode);
    setColor(c);
    setEvidence([]);
    setFocus(chosenFocus);
    const greeting = welcome();
    greeting.text = `This game, our focus is: ${focusInfo(chosenFocus).name.toLowerCase()}. ${focusInfo(chosenFocus).prompt} I will point out relevant moments as we play.`;
    setConversation([greeting]);
    setPendingStreams([greeting.id]);
    setId(crypto.randomUUID());
    setResult("");
    setMessage("Your move. Take your time and make it count.");
    setHint("");
    setError("");
    setBusy(false);
  }
  async function move(from: Square, to: Square, promotion: PieceSymbol = "q") {
    if (!active || busy || game.current.turn() !== color) return;
    const g = game.current;
    const before = g.fen();
    let m;
    try {
      m = g.move({ from, to, promotion });
    } catch {
      return;
    }
    cancelCoach("The position changed. Send your question again to discuss the new board.");
    const after = g.fen();
    setFen(after);
    setBusy(true);
    setHint("");
    const gen = generation.current;
    try {
      const a = await engine.analyze(before);
      const b = g.isGameOver()
        ? { score: g.isCheckmate() ? -10000 : 0 }
        : await engine.analyze(after);
      if (gen !== generation.current) return;
      const loss =
        a.move === m.from + m.to + (m.promotion ?? "")
          ? 0
          : Math.max(0, a.score + b.score);
      const focusEvent = focus ? observeFocus(focus, before, after, m, loss) : undefined;
      const ev: MoveEvidence = {
        beforeFen: before,
        afterFen: after,
        focusEvent,
        san: m.san,
        piece: m.piece,
        from: m.from,
        to: m.to,
        captured: m.captured,
        loss,
        ply: g.history().length,
      };
      const next = [...evidence, ev];
      setEvidence(next);
      const feedback = moveFeedback({
        before,
        after,
        san: m.san,
        loss,
        best: a.move,
        reply: "move" in b ? b.move : undefined,
        ply: ev.ply,
        previous: conversation,
      });
      if (focusEvent) feedback.text += " " + focusEvent.observation;
      addComment(feedback);
      setMessage(feedback.text);
      checkEnd(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }
  function undo() {
    if (busy || !active || !game.current.history().length) return;
    cancelCoach("The position changed. Send your question again to discuss the restored board.");
    generation.current++;
    game.current.undo();
    if (game.current.turn() !== color && game.current.history().length)
      game.current.undo();
    setEvidence(evidence.filter((m) => m.ply <= game.current.history().length));
    setFen(game.current.fen());
    setConversation((old) =>
      trimConversation(old, game.current.history().length),
    );
    setHint("");
    setMessage("Position restored. Try a different idea.");
  }
  function getHint() {
    if (!active || busy || game.current.turn() !== color) return;
    const text = positionFocus(game.current.fen());
    addComment({
      ply: game.current.history().length,
      role: "coach",
      kind: "hint",
      text,
      detail: text,
    });
    setHint("");
    setMessage(text);
  }
  return {
    game: game.current,
    fen,
    active,
    color,
    level,
    records,
    focus,
    focusSummary: focus ? summarizeFocus(focus, evidence) : null,
    evidence,
    result,
    busy,
    message,
    conversation,
    streamingIds,
    finishStream,
    askCoach,
    askConversational,
    coachBusy,
    coachError,
    cancelCoach,
    hint,
    error,
    start,
    move,
    undo,
    getHint,
    resign: () => finish("Resigned"),
    retry: () => setError(""),
  };
}
export type GameState = ReturnType<typeof useGame>;
