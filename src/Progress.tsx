import GameAccuracy from "./GameReviewSummary";
import { gameAccuracy, moveRating } from "./gameAccuracy";
import ProgressEvidence from "./ProgressEvidence";
import { useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  Target,
  Download,
  X,
} from "lucide-react";
import { focusInfo, summarizeFocus } from "./focus";
import type { ReviewPosition } from "./review";
import { type GameRecord, summarize } from "./coach";
export default function Progress({
  records,
  onPlay,
  onLearn,
  onExplore,
}: {
  records: GameRecord[];
  onExplore: (target: ReviewPosition) => void;
  onPlay: () => void;
  onLearn: () => void;
}) {
  const stats = summarize(records);
  const [review, setReview] = useState<GameRecord | null>(null);
  function download(g: GameRecord) {
    const url = URL.createObjectURL(
      new Blob([g.pgn], { type: "application/x-chess-pgn" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tempo-" + g.id.slice(0, 8) + ".pgn";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      {!records.length ? (
        <div className="empty-profile panel">
          <h2>Every game tells a story.</h2>
          <p>
            Play your first game to start discovering your style. Your coach
            looks for patterns in your moves, then turns them into a practical
            next step.
          </p>
          <button className="primary" onClick={onPlay}>
            Play your first game <ArrowRight size={17} />
          </button>
          <small>Your games stay in this browser. No account needed.</small>
        </div>
      ) : (
        <>
          <div className="stat-strip">
            <div>
              <strong>{records.length}</strong>
              <span>Games played</span>
            </div>
            <div>
              <strong>{stats.moves}</strong>
              <span>Moves analyzed</span>
            </div>
            <div>
              <strong>{stats.accurate}</strong>
              <span>Moves within 0.5 pawns of engine choice</span>
            </div>
          </div>
          <ProgressEvidence records={records} onExplore={onExplore} />
          <section className="profile-summary panel">
            
            <h2>{stats.style}</h2>
            <p>
              {stats.moves < 100 || records.length < 5
                ? "This is tentative until we have at least five games and one hundred analyzed moves."
                : "An early pattern from your saved games, not a permanent label."}{" "}
              Local Stockfish analysis and move patterns inform these
              recommendations.
            </p>
            <div className="insight-columns">
              <div>
                <h3>
                  <TrendingUp size={18} />
                  Keep doing
                </h3>
                {stats.strengths.length ? (
                  stats.strengths.map((s) => <p key={s}>{s}</p>)
                ) : (
                  <p>
                    More moves will help us identify repeatable strengths. Keep
                    practicing thoughtfully.
                  </p>
                )}
              </div>
              <div>
                <h3>
                  <Target size={18} />
                  Your next focus
                </h3>
                <p>{stats.focus}</p>
                <button className="text-link" onClick={onLearn}>
                  Build the habit <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
          <h2 className="history-title">Your recent games</h2>
          <div className="history-list">
            {records.map((g) => (
              <button key={g.id} onClick={() => setReview(g)}>
                <span>
                  <strong>{g.result}</strong>
                  <small>
                    {new Date(g.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {g.level} · Playing {g.color === "w" ? "white" : "black"}
                  </small>
                </span>
                <span>
                  {gameAccuracy(g.moves).score === null ? "Unscored" : `${gameAccuracy(g.moves).score}/100`} <ArrowRight size={17} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {review && (
        <div className="modal-backdrop">
          <div
            className="modal review"
            role="dialog"
            aria-modal="true"
            aria-label="Game review"
          >
            <button
              className="close"
              aria-label="Close review"
              onClick={() => setReview(null)}
            >
              <X />
            </button>
            <h2>{review.result}</h2>
            <p>
              {review.level} opponent · {review.moves.length} analyzed {review.moves.length === 1 ? "move" : "moves"}
            </p>
            <GameAccuracy moves={review.moves} pgn={review.pgn} onExplore={(target) => { setReview(null); onExplore(target); }} />
            {review.focus && <section className="saved-focus-summary">
              <h3>{focusInfo(review.focus).name}</h3>
              <p>{summarizeFocus(review.focus, review.moves).summary}</p>
              <p>{summarizeFocus(review.focus, review.moves).next}</p>
            </section>}
            <div className="review-moves">
              {review.moves.length ? (
                review.moves.map((m) => (
                  <div key={m.ply}>
                    <strong>
                      {Math.ceil(m.ply / 2)}{m.ply % 2 ? "." : "…"} {m.san}
                    </strong>
                    <span>
                      {moveRating(m.loss)}
                    </span>
                    {m.focusEvent && <p className="saved-focus-observation">{m.focusEvent.observation}</p>}
                    <button className="text-link" onClick={() => {
                      onExplore({ pgn: review.pgn, ply: m.ply, originalSan: m.san, originalLoss: m.loss });
                      setReview(null);
                    }}>Show me why <ArrowRight size={14} /></button>
                  </div>
                ))
              ) : (
                <p>No player moves recorded.</p>
              )}
            </div>
            <button className="primary" onClick={() => download(review)}>
              <Download size={16} />
              Export game as PGN
            </button>
          </div>
        </div>
      )}
    </>
  );
}
