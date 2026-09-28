import { ChevronDown } from "lucide-react";
import type { GameState } from "./useGame";

export default function GameHistory({ state }: { state: GameState }) {
  const history = state.game.history();
  return <section className="game-history panel" aria-label="Game history">
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
  </section>;
}
