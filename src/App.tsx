import { assetUrl, repositoryUrl, localCoachGuideUrl } from "./site";
import { useEffect, useState } from "react";
import {
  Play,
  BookOpen,
  Target,
  ChartNoAxesColumnIncreasing,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Placement from "./Placement";
import { normalizeDifficulty, recommendDifficulty } from "./difficulty";
import { loadSaved, save } from "./coach";
import MoveReview from "./MoveReview";
import type { ReviewPosition } from "./review";
import { focuses, type FocusId } from "./focus";
import Practice from "./Practice";
import Board from "./Board";
import CoachPanel from "./CoachPanel";
import GameHistory from "./GameHistory";
import Learn from "./Learn";
import Progress from "./Progress";
import { useGame, levels } from "./useGame";
export default function App() {
  const state = useGame();
  const [difficulty, setDifficulty] = useState(() => normalizeDifficulty(loadSaved("tempo-difficulty", null)));
  const [placementOpen, setPlacementOpen] = useState(false);
  const [difficultyError, setDifficultyError] = useState("");
  const recommendation = recommendDifficulty(state.records, difficulty.placement);
  useEffect(() => { if (!save("tempo-difficulty", difficulty)) setDifficultyError("Could not save difficulty preferences in this browser."); else setDifficultyError(""); }, [difficulty]);
  const [exploration, setExploration] = useState<ReviewPosition | null>(null);
  const [page, setPage] = useState("Play");
  const [setupRequested, setSetupRequested] = useState(false);
  const showCoach = state.active || (!!state.result && !setupRequested);
  const [chosenFocus, setChosenFocus] = useState<FocusId>("safety");
  const [level, setLevel] = useState(state.level);
  const effectiveLevel = difficulty.adaptive ? recommendation.level : difficulty.manualLevel ?? level;
  const [side, setSide] = useState("White");
  const [flipped, setFlipped] = useState(state.color === "b");
  function launch() {
    const color =
      side === "Random"
        ? Math.random() > 0.5
          ? "w"
          : "b"
        : side === "White"
          ? "w"
          : "b";
    state.start(effectiveLevel, color, chosenFocus, difficulty.adaptive ? "adaptive" : "manual");
    setFlipped(color === "b");
    setSetupRequested(false);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Play");
          }}
        >
          <img src={assetUrl("pieces/bN.svg")} alt="" />
          Tempo<span className="brand-dot">.</span>
        </a>
        <nav>
          {[
            { name: "Play", icon: Play },
            { name: "Learn", icon: BookOpen },
            { name: "Practice", icon: Target },
            { name: "Your progress", icon: ChartNoAxesColumnIncreasing },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => setPage(name)}
            >
              <Icon
                size={20}
                fill={
                  name === "Play" && page === name ? "currentColor" : "none"
                }
              />
              {name}
              {page === name && (
                <ChevronRight className="nav-arrow" size={15} />
              )}
            </button>
          ))}
        </nav>
      </aside>
      <main className={page === "Play" ? "play-page" : undefined}>
        {page === "Play" ? (
          <>
            <div className="play-layout">
              <div className="board-column">
                <Board state={state} flipped={flipped} setFlipped={setFlipped} />
                {showCoach && <GameHistory state={state} />}
              </div>
              <section
                className={`setup-panel panel ${showCoach ? "coaching" : "pre-game"}`}
              >
                {!showCoach ? (
                  <div className="setup-content">
                    <h2>Find your challenge</h2>
                    <p className="suggested-level">Suggested: {levels[recommendation.level].name} · ~{levels[recommendation.level].elo} Elo</p>
                    <div className="adaptive-settings">
                      <label><input type="checkbox" checked={difficulty.adaptive} onChange={(e) => setDifficulty({...difficulty, adaptive:e.target.checked, manualLevel:effectiveLevel})} />Adjust difficulty with my progress</label>
                      <button className="text-link" onClick={() => setPlacementOpen(true)}>{difficulty.placement ? "Retake placement check" : "Find my starting level"}</button>
                      {difficultyError && <p role="alert">{difficultyError}</p>}
                    </div>
                    <fieldset>
                      <legend>Choose opponent skill</legend>
                      <div className="levels">
                        {levels.map((l, i) => (
                          <button
                            key={l.name}
                            className={effectiveLevel === i ? "chosen" : ""}
                            aria-pressed={effectiveLevel === i}
                            onClick={() => { setLevel(i); setDifficulty({...difficulty, adaptive:false, manualLevel:i}); }}
                          >
                            <strong>{l.name}</strong>
                            <span>{l.elo}</span>
                            {effectiveLevel === i && <span className="selected-dot" />}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="side-field">
                      <legend>Play as</legend>
                      <div className="side-choice">
                        {["White", "Black", "Random"].map((s) => (
                          <button
                            className={side === s ? "chosen" : ""}
                            key={s}
                            onClick={() => setSide(s)}
                            aria-pressed={side === s}
                          >
                            {s === "White" ? (
                              <span className="color-dot white" />
                            ) : s === "Black" ? (
                              <span className="color-dot black" />
                            ) : (
                              <span className="color-dot random" />
                            )}
                            {s}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <button
                      className="primary start"
                      onClick={launch}
                      disabled={state.busy}
                    >
                      <Play fill="currentColor" size={18} />
                      Start game
                      <ArrowRight size={19} />
                    </button>
                    <fieldset className="focus-choice">
                      <legend>One focus for this game</legend>
                      <select aria-label="Game focus" value={chosenFocus} onChange={(e) => setChosenFocus(e.target.value as FocusId)}>
                        {focuses.map((focus) => <option key={focus.id} value={focus.id}>{focus.name}</option>)}
                      </select>
                      <p>{focuses.find((focus) => focus.id === chosenFocus)!.prompt}</p>
                    </fieldset>
                  </div>
                ) : (
                  <CoachPanel
                    state={state}
                    onExplore={setExploration}
                    onInsights={() => setPage("Your progress")}
                    onNewGame={() => setSetupRequested(true)}
                  />
                )}
                {state.error && (
                  <div className="error" role="alert">
                    {state.error}
                    <button onClick={state.retry}>Retry engine</button>
                  </div>
                )}
              </section>
            </div>
            <button
              className="learning-banner"
              onClick={() => setPage("Learn")}
            >
              <span className="book-circle">
                <BookOpen size={26} />
              </span>
              <span className="banner-copy">
                <strong>Small lessons. Stronger moves.</strong>
                <span>Explore the essentials, one concept at a time.</span>
              </span>
              <img className="landscape" src={assetUrl("landscape.png")} alt="" />
              <span className="text-link">
                Explore lessons
                <ArrowRight size={19} />
              </span>
            </button>

          </>
        ) : page === "Practice" ? (
          <Practice records={state.records} onPlay={() => setPage("Play")} />
        ) : page === "Learn" ? (
          <Learn />
        ) : (
          <Progress
            records={state.records}
            onExplore={setExploration}
            onPlay={() => {
              setPage("Play");
              setSetupRequested(true);
            }}
            onLearn={() => setPage("Learn")}
          />
        )}
        <footer className="project-footer">
          <p>Practice stays in this browser. Export PGN to keep a copy of your games.</p>
          <div>
            <a href={repositoryUrl} target="_blank" rel="noreferrer">View on GitHub ↗</a>
            <a href={localCoachGuideUrl} target="_blank" rel="noreferrer">Run the AI coach locally ↗</a>
            <a href={assetUrl("THIRD_PARTY_NOTICES.txt")} target="_blank" rel="noreferrer">Credits & licenses ↗</a>
          </div>
        </footer>
      </main>
      {placementOpen && <Placement onClose={() => setPlacementOpen(false)} onComplete={(placement) => { setDifficulty({adaptive:true,placement}); setPlacementOpen(false); }} />}
      {exploration && <MoveReview target={exploration} onClose={() => setExploration(null)} />}
    </div>
  );
}
