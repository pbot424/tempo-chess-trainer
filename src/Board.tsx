import { assetUrl } from "./site";
import { useState } from "react";
import type { Square, PieceSymbol } from "chess.js";
import { Lightbulb, Undo2, RefreshCw, Flag, UserRound } from "lucide-react";
import { type GameState, levels } from "./useGame";
const names: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export default function Board({
  state,
  flipped,
  setFlipped,
}: {
  state: GameState;
  flipped: boolean;
  setFlipped: (b: boolean) => void;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const g = state.game;
  const files = (flipped ? "hgfedcba" : "abcdefgh").split("");
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const legal = selected ? g.moves({ square: selected, verbose: true }) : [];
  const history = g.history({ verbose: true });
  const last = history.at(-1);
  function click(square: Square) {
    if (!state.active || state.busy || g.turn() !== state.color) return;
    const target = legal.find((m) => m.to === square);
    if (selected && target) {
      if (target.isPromotion()) setPromotion({ from: selected, to: square });
      else void state.move(selected, square);
      setSelected(null);
    } else setSelected(g.get(square)?.color === state.color ? square : null);
  }
  const status =
    state.result ||
    (state.busy
      ? "Thinking…"
      : state.active
        ? g.isCheck()
          ? "You are in check"
          : g.turn() === state.color
            ? "Your turn"
            : "Opponent’s turn"
        : "Ready when you are");
  const playerAtBottom = state.color === (flipped ? "b" : "w");
  const playerIdentity = <>
        <span className="avatar">
          <UserRound size={25} />
        </span>
        <div>
          <strong>You</strong>
          <span>{state.color === "w" ? "White" : "Black"} pieces</span>
        </div>
  </>;
  const opponentIdentity = <>
        <span className="avatar bot">
          <img src={assetUrl("pieces/bN.svg")} alt="" />
        </span>
        <div>
          <strong>{levels[state.level].bot}</strong>
          <span>
            {state.level === 1 ? "Friendly" : levels[state.level].name} · ~
            {levels[state.level].elo} Elo
          </span>
        </div>
  </>;
  return (
    <section className="board-panel panel">
      <div className="player">
        {playerAtBottom ? opponentIdentity : playerIdentity}
        <span className="status">
          <i />
          {status}
        </span>
      </div>
      <div className="board-wrap">
        <div className="ranks">
          {ranks.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
        <div className="chessboard" aria-label="Chessboard">
          {ranks.flatMap((rank, ri) =>
            files.map((file, fi) => {
              const square = (file + rank) as Square;
              const piece = g.get(square);
              const possible = legal.some((m) => m.to === square);
              return (
                <button
                  key={square}
                  className={`square ${(ri + fi) % 2 ? "dark" : "light"} ${selected === square ? "selected" : ""} ${last && (last.from === square || last.to === square) ? "last" : ""}`}
                  aria-label={`${square}${piece ? " " + (piece.color === "w" ? "white" : "black") + " " + names[piece.type] : ""}`}
                  aria-pressed={selected === square}
                  onClick={() => click(square)}
                >
                  {piece && (
                    <img
                      draggable="false"
                      src={assetUrl(`pieces/${piece.color}${piece.type.toUpperCase()}.svg`)}
                      alt=""
                    />
                  )}
                  {possible && (
                    <span className={piece ? "legal capture" : "legal"} />
                  )}
                </button>
              );
            }),
          )}
        </div>
        <div className="files">
          {files.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>
      <div className="player bottom">
        {playerAtBottom ? playerIdentity : opponentIdentity}
        <div className="board-tools">
          <button
            aria-label="Hint"
            disabled={!state.active || state.busy || g.turn() !== state.color}
            onClick={() => void state.getHint()}
          >
            <Lightbulb /> <span>Hint</span>
          </button>
          <button
            aria-label="Undo"
            disabled={!state.active || state.busy || !history.length}
            onClick={() => {
              setSelected(null);
              state.undo();
            }}
          >
            <Undo2 />
            <span>Undo</span>
          </button>
          <button aria-label="Flip board" onClick={() => setFlipped(!flipped)}>
            <RefreshCw />
            <span>Flip board</span>
          </button>
        </div>
      </div>
      {state.active && (
        <div className="game-foot">
          <button disabled={state.busy} onClick={() => setConfirm(true)}>
            <Flag size={14} />
            Resign
          </button>
        </div>
      )}
      {promotion && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Promote pawn"
            className="modal"
          >
            <h2>Your pawn earned a promotion.</h2>
            <p>Choose a piece.</p>
            <div className="promotion">
              {(["q", "r", "b", "n"] as PieceSymbol[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    void state.move(promotion.from, promotion.to, p);
                    setPromotion(null);
                  }}
                  aria-label={`Promote to ${names[p]}`}
                >
                  <img
                    src={assetUrl(`pieces/${state.color}${p.toUpperCase()}.svg`)}
                    alt={names[p]}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Resign game"
          >
            <h2>Finish this game?</h2>
            <p>
              Your moves will be saved to your profile so you can learn from
              them.
            </p>
            <div className="actions">
              <button onClick={() => setConfirm(false)}>Keep playing</button>
              <button
                className="primary"
                onClick={() => {
                  state.resign();
                  setConfirm(false);
                }}
              >
                Resign & save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
