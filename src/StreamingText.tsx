import { useEffect, useState } from "react";

const WORD_MS = 55;

/** A single reveal for a new message; saved conversation text renders immediately. */
export default function StreamingText({
  id, text, animate, onDone, onProgress,
}: {
  id: string;
  text: string;
  animate: boolean;
  onDone: (id: string) => void;
  onProgress: () => void;
}) {
  const words = text.match(/\S+\s*/g) ?? [];
  const [count, setCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const done = !animate || reducedMotion || count >= words.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (!animate) return;
    if (done) {
      onDone(id);
      return;
    }
    const timer = window.setTimeout(() => setCount((value) => value + 1), WORD_MS);
    return () => window.clearTimeout(timer);
  }, [animate, done, count, id, onDone]);

  useEffect(() => { onProgress(); }, [count, done, onProgress]);

  return (
    <p className="streaming-text" data-streaming={!done}>
      {/* Announce the message once, instead of announcing every added word. */}
      <span className="streaming-accessible">{text}</span>
      <span aria-hidden="true">
        {(done ? words : words.slice(0, count)).map((word, index) => (
          <span className={animate && !reducedMotion ? "streaming-word" : undefined} key={index}>{word}</span>
        ))}
        {!done && <span className="streaming-cursor" />}
      </span>
    </p>
  );
}
