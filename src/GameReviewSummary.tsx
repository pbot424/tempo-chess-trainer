import type { MoveEvidence } from "./coach";
import type { ReviewPosition } from "./review";
import { gameAccuracy, moveRating, moveRatings } from "./gameAccuracy";

export default function GameAccuracy({ moves, pgn, onExplore }: {
  moves: MoveEvidence[]; pgn: string; onExplore: (target: ReviewPosition) => void;
}) {
  const review = gameAccuracy(moves);
  return <section className="accuracy-review" aria-label="Tempo game review">
    <div className="accuracy-heading"><div><h3>Tempo accuracy</h3><small>{review.analyzed} {review.analyzed === 1 ? "move" : "moves"}{review.limited && review.analyzed > 0 ? " · Short game" : ""}{review.incomplete ? " · Partial review" : ""}</small></div><strong>{review.score === null ? "—" : review.score}<small>{review.score !== null ? "/100" : "No moves to score"}</small></strong></div>
    {review.score !== null && <>
      <div className="accuracy-counts">{moveRatings.map((rating) => <div key={rating}><strong>{review.counts[rating]}</strong><span>{rating}</span></div>)}</div>
      {review.keyMoments.length > 0 && <div className="accuracy-moments"><h4>Key moments</h4>{review.keyMoments.map((m) => <button key={m.ply} className="text-link" onClick={() => onExplore({pgn, ply:m.ply, originalSan:m.san, originalLoss:m.loss})}><span>{Math.ceil(m.ply / 2)}{m.ply % 2 ? "." : "…"} {m.san}</span><span>{moveRating(m.loss)} · Revisit →</span></button>)}</div>}
    </>}
    <details className="accuracy-method"><summary>About this score</summary><p>A Tempo estimate from your analyzed moves, not an Elo rating or a Chess.com score. Short games give less context. Each move starts at 100 and loses credit as its estimated cost rises; the game score averages those values. Scores may change with deeper review.</p></details>
  </section>;
}
