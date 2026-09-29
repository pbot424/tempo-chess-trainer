import { useMemo, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { loadSaved, save, type GameRecord } from "./coach";
import { buildPractice, practiceDue, practiceThemes, recordPractice, type Exercise, type PracticeProgress } from "./practiceData";
import MoveReview from "./MoveReview";

export default function Practice({ records, onPlay }: { records: GameRecord[]; onPlay: () => void }) {
  const library = useMemo(() => buildPractice(records), [records]);
  const [progress, setProgress] = useState<PracticeProgress>(() => loadSaved("tempo-practice", {}));
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const due = library.exercises.filter((item) => practiceDue(progress[item.key], Date.now()));
  const solved = library.exercises.filter((item) => progress[item.key]?.solvedAt).length;
  const visible = library.exercises.filter((item) => filter === "all" || item.theme === filter)
    .sort((a,b) => Number(practiceDue(progress[b.key], Date.now())) - Number(practiceDue(progress[a.key], Date.now())));
  return <div className="practice-page">
    {!library.exercises.length ? <section className="panel practice-empty">
      <h2>{library.candidateCount ? "A pattern needs another example." : "Your games become your practice."}</h2>
      <p>Play and save games to build your practice set.</p>
      <button className="primary" onClick={onPlay}>Play a game <ArrowRight size={16} /></button>
    </section> : <>
      <div className="practice-overview panel">
        <div><h2>{due.length ? `${due.length} ${due.length === 1 ? "position" : "positions"} to revisit` : "Your next review can wait."}</h2>
          <p>{solved} of {library.exercises.length} positions with a sound alternative found. Revisit them after three days to check recall.</p></div>
        <button className="primary" onClick={() => setExercise(due[0] ?? library.exercises[0])}>{due.length ? "Start a short exercise" : "Practice again"}<ArrowRight size={16} /></button>
      </div>
      <div className="practice-filter"><label htmlFor="practice-theme">Practice theme</label>
        <select id="practice-theme" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All recurring themes</option>
          {Object.entries(library.themes).filter(([,count]) => count >= 2).map(([key,count]) => <option key={key} value={key}>{practiceThemes[key as keyof typeof practiceThemes].title} ({count} moments)</option>)}
        </select>
      </div>
      <div className="practice-grid">{visible.map((item) => {
        const record = progress[item.key];
        const ready = practiceDue(record, Date.now());
        return <article className="panel practice-card" key={item.key}>
          <h3>{practiceThemes[item.theme].title}</h3>
          <p>{practiceThemes[item.theme].prompt}</p>
          <small>{new Date(item.date).toLocaleDateString(undefined, {month:"short",day:"numeric"})} · Move {Math.ceil(item.ply/2)} · {item.ply % 2 ? "White" : "Black"}{item.occurrences > 1 ? ` · This position appeared ${item.occurrences} times` : ""}</small>
          <div className="practice-status">{record?.solvedAt ? ready ? "Time to check your recall" : "Sound alternative found" : record ? "Keep exploring" : "Not tried yet"}
            {record && <span>{Object.keys(record.attempts).length} distinct {Object.keys(record.attempts).length === 1 ? "idea" : "ideas"} tried</span>}</div>
          <button className="text-link" onClick={() => setExercise(item)}>{record ? <RefreshCw size={14} /> : null}{record ? "Revisit position" : "Try this position"}<ArrowRight size={15} /></button>
        </article>;
      })}</div>
    </>}
    {library.skipped > 0 && <p className="muted">Some saved move data could not be reconstructed and was left out of practice.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {exercise && <MoveReview target={exercise} practice={practiceThemes[exercise.theme]} onClose={() => setExercise(null)} onAttempt={(result) => {
      const next = recordPractice(progress, exercise, result, new Date().toISOString());
      setProgress(next);
      if (!save("tempo-practice", next)) setError("Your practice worked, but browser storage is full. This progress could not be saved.");
      else setError("");
    }} />}
  </div>;
}
