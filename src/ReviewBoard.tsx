import { assetUrl } from "./site";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import { useState } from "react";

const names: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
export default function ReviewBoard({ fen, color, disabled, onMove }: {
  fen: string; color: "w" | "b"; disabled: boolean;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
}) {
  const game = new Chess(fen);
  const [selected, select] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const files = (color === "b" ? "hgfedcba" : "abcdefgh").split("");
  const ranks = color === "b" ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const legal = selected && !disabled ? game.moves({ square: selected, verbose: true }) : [];
  function click(square: Square) {
    if (disabled || promotion) return;
    const move = legal.find((m) => m.to === square);
    if (selected && move) {
      if (move.isPromotion()) setPromotion({ from: selected, to: square });
      else onMove(selected, square);
      select(null);
    } else select(game.get(square)?.color === game.turn() ? square : null);
  }
  return <div>
    <div className="board-wrap">
      <div className="ranks">{ranks.map((r) => <span key={r}>{r}</span>)}</div>
      <div className="chessboard" aria-label="Practice chessboard">
        {ranks.flatMap((rank, ri) => files.map((file, fi) => {
          const square = (file + rank) as Square;
          const piece = game.get(square);
          return <button key={square} disabled={disabled || !!promotion}
            className={`square ${(ri + fi) % 2 ? "dark" : "light"} ${selected === square ? "selected" : ""}`}
            aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${names[piece.type]}` : ""}`}
            aria-pressed={selected === square} onClick={() => click(square)}>
            {piece && <img draggable="false" src={assetUrl(`pieces/${piece.color}${piece.type.toUpperCase()}.svg`)} alt="" />}
            {legal.some((m) => m.to === square) && <span className={piece ? "legal capture" : "legal"} />}
          </button>;
        }))}
      </div>
      <div className="files">{files.map((f) => <span key={f}>{f}</span>)}</div>
    </div>
    {promotion && <div className="review-promotion" role="group" aria-label="Choose promotion piece">
      <p>Promote your pawn to:</p>
      {(["q","r","b","n"] as PieceSymbol[]).map((piece) => <button key={piece} onClick={() => {
        onMove(promotion.from, promotion.to, piece); setPromotion(null);
      }}>{names[piece]}</button>)}
      <button onClick={() => setPromotion(null)}>Cancel</button>
    </div>}
  </div>;
}
