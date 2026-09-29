import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Clock3, BookOpen } from "lucide-react";
import { lessons } from "./lessons";
import { loadSaved, save } from "./coach";
export default function Learn() {
  const [category, setCategory] = useState("All concepts");
  const [current, setCurrent] = useState<string | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [completed, setCompleted] = useState<string[]>(() =>
    loadSaved("tempo-lessons", []),
  );
  const lesson = lessons.find((l) => l.id === current);
  function finish() {
    if (!lesson) return;
    const next = [...new Set([...completed, lesson.id])];
    setCompleted(next);
    save("tempo-lessons", next);
  }
  if (lesson)
    return (
      <div className="lesson-detail">
        <button
          className="back"
          onClick={() => {
            setCurrent(null);
            setAnswer(null);
          }}
        >
          <ArrowLeft size={17} />
          All lessons
        </button>
        <h1>{lesson.title}</h1>
        <p className="intro">{lesson.description}</p>
        <article>
          {lesson.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
        <section className="quiz panel">
          <h2>{lesson.question}</h2>
          {lesson.answers.map((a, i) => (
            <button
              className={`answer ${answer === i ? (i === lesson.correct ? "correct" : "incorrect") : ""}`}
              key={a}
              onClick={() => {
                setAnswer(i);
                if (i === lesson.correct) finish();
              }}
            >
              {a}
              {answer === i && i === lesson.correct && <Check size={18} />}
            </button>
          ))}
          {answer !== null && (
            <p role="status">
              {answer === lesson.correct
                ? "Exactly. " + lesson.explanation
                : "Not quite. Revisit the idea above and try again."}
            </p>
          )}
        </section>
      </div>
    );
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Small lessons. Stronger moves.</h1>
        </div>
        <span className="completion">
          <BookOpen size={18} />
          {completed.length} / {lessons.length} completed
        </span>
      </header>
      <div className="lesson-filters" aria-label="Lesson categories">
        {[
          "All concepts",
          "Foundations",
          "Opening",
          "Tactics",
          "Strategy",
          "Endgame",
          "Practice",
        ].map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="lesson-list">
        {lessons
          .filter((l) => category === "All concepts" || l.category === category)
          .map((l, i) => (
            <button
              key={l.id}
              className="lesson-row"
              onClick={() => {
                setCurrent(l.id);
                setAnswer(null);
              }}
            >
              <span className="lesson-number">
                {completed.includes(l.id) ? (
                  <Check />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <span className="lesson-meta">{l.category}</span>
                <h2>{l.title}</h2>
                <p>{l.description}</p>
              </div>
              <span className="read-time">
                <Clock3 size={15} />
                {l.minutes} min
              </span>
              <ArrowUpRight size={21} />
            </button>
          ))}
      </div>
    </>
  );
}
