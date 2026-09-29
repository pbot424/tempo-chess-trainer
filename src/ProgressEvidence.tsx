import type { GameRecord } from "./coach";
import { progressEvidence, type VerifiedMoment } from "./progressData";
import type { ReviewPosition } from "./review";

export default function ProgressEvidence({ records, onExplore }: { records: GameRecord[]; onExplore: (target: ReviewPosition) => void }) {
  const evidence = progressEvidence(records);
  const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
  function example(moment: VerifiedMoment, label: string) {
    return <button className="evidence-example" key={`${label}-${moment.game.id}-${moment.move.ply}`} onClick={() => onExplore({
      pgn: moment.game.pgn, ply: moment.move.ply, originalSan: moment.move.san, originalLoss: moment.move.loss,
    })}><span>{label}</span><strong>{Math.ceil(moment.move.ply/2)}{moment.game.color === "w" ? "." : "…"} {moment.move.san}</strong>
      <small>{new Date(moment.game.date).toLocaleDateString(undefined,{month:"short",day:"numeric"})} · {moment.game.level} · {(moment.move.loss/100).toFixed(1)} pawn loss</small>
      <span>Explore this position →</span></button>;
  }
  return <section className="panel evidence-panel" aria-label="Progress evidence">
    
    <h2>{evidence.headline}</h2>
    <p>{evidence.ready
      ? `Your rate changed by ${Math.abs(evidence.difference!).toFixed(1)} percentage points ${evidence.difference! < 0 ? "down" : "up"}, comparing your latest five analyzed games with the five before them.`
      : `A trend needs ten analyzed games and at least twenty analyzed player moves in each five-game group. You have ${evidence.eligibleGames} analyzed ${evidence.eligibleGames === 1 ? "game" : "games"}; the counts below show the evidence so far.`}</p>
    <div className="evidence-table-wrap"><table>
      <caption>Rates compare groups with different numbers of analyzed player moves.</caption>
      <thead><tr><th scope="col">Evidence</th><th scope="col">Latest group ({evidence.recent.games} games)</th><th scope="col">Previous group ({evidence.previous.games} games)</th></tr></thead>
      <tbody>
        <tr><th scope="row">Player moves analyzed</th><td>{evidence.recent.moves}</td><td>{evidence.previous.moves}</td></tr>
        <tr><th scope="row">Costly moves</th><td>{evidence.recent.mistakes} · {rate(evidence.recent.mistakeRate)}</td><td>{evidence.previous.mistakes} · {rate(evidence.previous.mistakeRate)}</td></tr>
        <tr><th scope="row">Exposed-piece setbacks</th><td>{evidence.recent.exposed} · {rate(evidence.recent.exposedRate)}</td><td>{evidence.previous.exposed} · {rate(evidence.previous.exposedRate)}</td></tr>
      </tbody>
    </table></div>
    <details className="evidence-method"><summary>What these numbers mean</summary>
      <p>Costly moves lose at least 1.5 pawns of evaluation in a short engine search. An exposed-piece setback also leaves an attacked piece with no direct defender, outside a forced check escape. These measures describe the board, not whether you noticed a threat. Sacrifices and longer tactics need human review.</p>
      <p>Only moves verified against saved game notation are counted. Opponent difficulty and position complexity can change between groups; this is a practice trend, not a rating or proof of improvement.</p>
      {evidence.skipped > 0 && <p>{evidence.skipped} invalid game or move records were excluded.</p>}
    </details>
    <div className="evidence-examples">
      {evidence.recent.examples.map((moment) => example(moment, "Recent moment to revisit"))}
      {evidence.previous.examples.map((moment) => example(moment, "Earlier comparison"))}
      {evidence.recent.soundExample && example(evidence.recent.soundExample, "Recent sound decision")}
    </div>
  </section>;
}
