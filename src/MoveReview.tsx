import { useEffect, useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import type { PieceSymbol, Square } from "chess.js";
import { engine } from "./engine";
import { analyzeAttempt, reviewPosition, reviewQuestion, type AttemptResult, type ReviewPosition } from "./review";
import ReviewBoard from "./ReviewBoard";

export default function MoveReview({ target, onClose, practice, onAttempt }: {
  target: ReviewPosition; onClose: () => void;
  practice?: { title: string; prompt: string };
  onAttempt?: (result: AttemptResult) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const [position] = useState(() => {
    try { return { game: reviewPosition(target), error: "" }; }
    catch (error) { return { game: null, error: (error as Error).message }; }
  });
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [boardKey, setBoardKey] = useState(0);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { generation.current++; dialog.current?.close(); opener?.focus(); };
  }, []);
  async function play(from: Square, to: Square, promotion?: PieceSymbol) {
    if (busy) return;
    const gen = ++generation.current;
    setBusy(true); setError("");
    try {
      const result = await analyzeAttempt(target, { from, to, promotion }, (fen) => engine.analyze(fen));
      if (gen === generation.current) { setAttempt(result); onAttempt?.(result); }
    } catch (err) {
      if (gen === generation.current) setError((err as Error).message);
    } finally { if (gen === generation.current) setBusy(false); }
  }
  function reset() {
    generation.current++; setAttempt(null); setShowOriginal(false); setError(""); setBusy(false); setBoardKey((k) => k + 1);
  }
  let fen = position.game?.fen() ?? "";
  if (position.game && showOriginal) {
    const original = reviewPosition(target); original.move(target.originalSan); fen = original.fen();
  } else if (attempt) fen = attempt.fen;
  return <dialog ref={dialog} className="move-review-dialog" aria-labelledby="move-review-title" onCancel={(e) => { e.preventDefault(); onClose(); }}>
    <header className="move-review-header">
      <div><h2 id="move-review-title">{practice?.title ?? "Show me why"}</h2></div>
      <button autoFocus className="review-close" aria-label="Close exploration" onClick={onClose}><X size={20} /></button>
    </header>
    {position.game ? <div className="move-review-layout">
      <section>
        <p className="review-position-label">{showOriginal ? `After your original ${target.originalSan}` : attempt ? `Your try: ${attempt.san}` : `Before ${Math.ceil(target.ply / 2)}${position.game.turn() === "w" ? "." : "…"} ${target.originalSan}`} · {position.game.turn() === "w" ? "White" : "Black"} to explore</p>
        <ReviewBoard key={`${boardKey}-${showOriginal}-${!!attempt}`} fen={fen} color={position.game.turn()} disabled={busy || showOriginal || !!attempt} onMove={play} />
        <div className="review-controls">
          <button disabled={busy} onClick={() => { setShowOriginal((value) => !value); }}>{showOriginal ? "Back to my exploration" : "See original move"}</button>
          <button disabled={busy} onClick={reset}><RotateCcw size={14} />Try another idea</button>
        </div>
      </section>
      <section className="review-guidance" aria-live="polite">
        
        <h3>{busy ? "Thinking through your idea…" : showOriginal ? "What changed?" : attempt ? attempt.verdict : "Take a fresh look."}</h3>
        <p>{showOriginal ? "Compare the position before and after your move. Which attacks, defenders, or lines changed? Go back and test another idea on the board." : attempt ? attempt.question : practice?.prompt ?? reviewQuestion(target)}</p>
        {!attempt && !showOriginal && <p className="muted">Choose a piece and try a legal move. I’ll help you examine it without giving you the answer.</p>}
        {error && <p role="alert" className="error">{error} Try your move again.</p>}
      </section>
    </div> : <p role="alert">{position.error}</p>}
    <footer><button className="primary" onClick={onClose}>{practice ? "Back to practice" : "Return to game"}</button></footer>
  </dialog>;
}
