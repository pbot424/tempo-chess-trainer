import { useEffect, useRef, useState } from "react";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import { X } from "lucide-react";
import ReviewBoard from "./ReviewBoard";
import { engine } from "./engine";
import { placementLevel, placementTasks, type PlacementResult } from "./difficulty";
import { levels } from "./useGame";
export default function Placement({ onClose, onComplete }: { onClose: () => void; onComplete: (result: PlacementResult) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const [losses, setLosses] = useState<(number | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ loss: number; fen: string } | null>(null);
  const task = placementTasks[losses.length];
  const complete = losses.length === placementTasks.length;
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { generation.current++; dialog.current?.close(); opener?.focus(); }; }, []);
  async function play(from: Square, to: Square, promotion?: PieceSymbol) {
    if (busy || feedback || !task) return;
    const gen = ++generation.current; setBusy(true); setError("");
    try {
      const g = new Chess(task.fen); const move = g.move({from,to,promotion});
      const before = await engine.analyze(task.fen, 20, 400);
      const after = g.isGameOver() ? { score: g.isCheckmate() ? -10000 : 0 } : await engine.analyze(g.fen(), 20, 400);
      const loss = before.move === from + to + (move.promotion ?? "") ? 0 : Math.max(0,before.score + after.score);
      if (gen === generation.current) setFeedback({loss, fen:g.fen()});
    } catch (err) { if (gen === generation.current) setError((err as Error).message); }
    finally { if (gen === generation.current) setBusy(false); }
  }
  function next(loss: number | null) { setLosses((values) => [...values,loss]); setFeedback(null); setError(""); }
  return <dialog ref={dialog} className="move-review-dialog placement-dialog" aria-labelledby="placement-title" onCancel={(e)=>{e.preventDefault();onClose();}}>
    <header className="move-review-header"><div><span className="section-label">FIND YOUR STARTING CHALLENGE</span><h2 id="placement-title">A short placement check</h2></div><button autoFocus className="review-close" aria-label="Close placement" onClick={onClose}><X size={20}/></button></header>
    {complete ? <section className="placement-result"><h3>Start with {levels[placementLevel(losses)].name}</h3>
      <p>That is roughly our {levels[placementLevel(losses)].elo} Elo training setting. Three positions give a starting suggestion, not a chess rating. Adaptive play will refine it using your games.</p>
      <button className="primary" onClick={()=>onComplete({level:placementLevel(losses),losses,completedAt:new Date().toISOString()})}>Use this starting level</button>
    </section> : <div className="move-review-layout"><section>
      <p className="review-position-label">Position {losses.length+1} of {placementTasks.length} · White to move</p>
      <ReviewBoard key={losses.length} fen={feedback?.fen ?? task.fen} color="w" disabled={busy || !!feedback} onMove={play}/>
    </section><section className="review-guidance" aria-live="polite"><h3>{task.title}</h3><p>{task.prompt}</p>
      <p>{busy ? "Checking your idea…" : feedback ? feedback.loss < 50 ? "Your idea holds up in this short search. Let's try the next position." : "This position has more to explore. That's useful for finding a comfortable starting level." : "Choose one move. There is no clock, and you can skip a position if it feels unfamiliar."}</p>
      {error && <p role="alert" className="error">{error} Try again or skip this position.</p>}
      {feedback ? <button className="primary" onClick={()=>next(feedback.loss)}>{losses.length === 2 ? "See my starting level" : "Next position"}</button> : <button disabled={busy} className="text-link" onClick={()=>next(null)}>This feels unfamiliar — skip</button>}
      <small>Skipped positions suggest a gentler starting point. You can always choose your own opponent.</small>
    </section></div>}
  </dialog>;
}
