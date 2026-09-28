import { localCoachGuideUrl } from "./site";
import { useCallback, useEffect, useRef } from "react";
import {
  Sprout,
  ArrowRight,
  MessageCircle,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { focusInfo } from "./focus";
import CoachComposer from "./CoachComposer";
import StreamingText from "./StreamingText";
import type { ReviewPosition } from "./review";
import type { GameState } from "./useGame";
export default function CoachPanel({
  state,
  onInsights,
  onNewGame,
  onExplore,
}: {
  state: GameState;
  onExplore: (target: ReviewPosition) => void;
  onInsights: () => void;
  onNewGame: () => void;
}) {
  const feed = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const scrollToLatest = useCallback(() => {
    if (feed.current && followLatest.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, []);
  useEffect(scrollToLatest, [state.conversation.length, state.busy, state.coachBusy, state.result, scrollToLatest]);
  const streaming = state.streamingIds.length > 0;
  const history = state.game.history();
  const hasExplanation = state.conversation.some((e) => e.detail);
  return (
    <div className="live-coach">
      <div className="live-coach-header">
        <span className="story-icon">
          <Sprout size={24} />
        </span>
        <div>
          <h2>Your coach</h2>
          <p>
            {state.result
              ? "Let’s learn from this game."
              : "Watching the board with you."}
          </p>
        </div>
        <span
          className="coach-presence"
          aria-label={
            state.result ? "Game complete" : "Coach is following the game"
          }
        />
      </div>
      {state.focus && <div className="game-focus" aria-label="Current game focus">
        <span>THIS GAME'S FOCUS</span><strong>{focusInfo(state.focus).name}</strong>
        <small>{state.focusSummary?.reinforced ?? 0} supported / {state.focusSummary?.revisit ?? 0} to revisit</small>
      </div>}
      <div
        ref={feed}
        onScroll={() => {
          const node = feed.current;
          if (node) followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}
        className="coach-conversation"
        role="log"
        aria-label="Coach conversation"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {state.conversation.map((entry) => (
          <div
            className={`conversation-entry ${entry.role} ${entry.kind}`}
            key={entry.id}
          >
            <div className="conversation-meta">
              <span>
                {entry.role === "player"
                  ? "You"
                  : entry.kind === "praise"
                    ? "Keep doing this"
                    : entry.kind === "improve"
                      ? "A learning moment"
                      : entry.kind === "hint"
                        ? "Let’s look together"
                        : "Coach"}
              </span>
              {entry.move && <strong>{entry.move}</strong>}
            </div>
            {entry.role === "coach" ? (
              <StreamingText id={entry.id} text={entry.text}
                animate={state.streamingIds.includes(entry.id)}
                onDone={state.finishStream} onProgress={scrollToLatest} />
            ) : <p>{entry.text}</p>}
            {entry.kind === "improve" && state.evidence.some((m) => m.ply === entry.ply) && <button
              className="text-link explore-move" disabled={state.busy} onClick={() => {
                const move = state.evidence.find((m) => m.ply === entry.ply)!;
                onExplore({ pgn: state.game.pgn(), ply: move.ply, originalSan: move.san, originalLoss: move.loss });
              }}>Show me why <ArrowRight size={14} /></button>}
          </div>
        ))}
        {(state.busy || state.coachBusy) && (
          <div className="coach-thinking">
            <span className="thinking-dots">•••</span>
            {state.coachBusy ? "Thinking about your question…" : state.game.turn() === state.color
              ? "Looking at the position…"
              : "Following the moves…"}
          </div>
        )}
        {state.result && (
          <div className="conversation-entry result">
            <div className="conversation-meta">Game complete</div>
            <p>{state.result}</p>
            {state.focusSummary && <div className="focus-summary">
              <strong>Your focus, in review</strong>
              <p>{state.focusSummary.summary}</p><p>{state.focusSummary.next}</p>
            </div>}
            <span>
              Review your game to find an idea to take into the next one.
            </span>
          </div>
        )}
      </div>
      <div className={`coach-followups ${streaming ? "is-streaming" : "is-ready"}`}>
        <span>Talk it through</span>
        <div>
          <button
            disabled={state.busy || state.coachBusy || streaming || !hasExplanation}
            onClick={() => state.askCoach("explain")}
          >
            <MessageCircle size={14} />
            Explain that move
          </button>
          <button disabled={state.busy || state.coachBusy || streaming} onClick={() => state.askCoach("focus")}>
            <Lightbulb size={14} />
            What should I look for?
          </button>
        </div>
      </div>
      {__LOCAL_COACH__ ? <CoachComposer state={state} /> : <div className="local-coach-note">
        <strong>Want to talk through your thinking?</strong>
        <p>Play and move feedback run in your browser. For open-ended AI conversations, run Tempo locally with Ollama.</p>
        <a href={localCoachGuideUrl} target="_blank" rel="noreferrer">Set up your local AI coach ↗</a>
      </div>}
      <details className="coach-moves">
        <summary>
          Move history{" "}
          <span>
            <ChevronDown size={14} />
          </span>
        </summary>
        <div className="move-list">
          {history.length ? (
            Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
              <div key={i}>
                <span>{i + 1}.</span>
                <strong>{history[i * 2]}</strong>
                <strong>{history[i * 2 + 1] || "—"}</strong>
              </div>
            ))
          ) : (
            <p>Your first move is still ahead.</p>
          )}
        </div>
      </details>
      {state.result && (
        <div className="coach-end-actions">
          <button className="primary" onClick={onInsights}>
            See your game insights
            <ArrowRight size={16} />
          </button>
          <button className="new-game-link" onClick={onNewGame}>
            Play another game
          </button>
        </div>
      )}
      <small className="coach-source">
        {__LOCAL_COACH__ ? "Move feedback uses local engine analysis. Written questions use the connected AI coach." : "Move feedback uses Stockfish analysis in your browser. No AI account or API key needed."}
      </small>
    </div>
  );
}
