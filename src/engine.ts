import { assetUrl } from "./site";
export type Analysis = { move: string; score: number };
class Engine {
  private worker: Worker | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private async run(fen: string, skill: number, ms: number): Promise<Analysis> {
    if (!this.worker)
      this.worker = new Worker(assetUrl("engine/stockfish-19-lite-single.js"));
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      let score = 0;
      const timer = setTimeout(() => {
        worker.terminate();
        this.worker = null;
        reject(new Error("The engine took too long. Please try again."));
      }, 15000);
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        this.worker = null;
        reject(new Error("Could not load the chess engine. Reload to retry."));
      };
      worker.onmessage = (e: MessageEvent<string>) => {
        const line = String(e.data);
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (cp) score = Number(cp[1]);
        if (mate) score = Number(mate[1]) > 0 ? 10000 : -10000;
        if (line.startsWith("bestmove")) {
          clearTimeout(timer);
          resolve({ move: line.split(" ")[1], score });
        }
      };
      worker.postMessage("setoption name Skill Level value " + skill);
      worker.postMessage("position fen " + fen);
      worker.postMessage("go movetime " + ms);
    });
  }
  analyze(fen: string, skill = 20, ms = 220): Promise<Analysis> {
    const result = this.queue.then(() => this.run(fen, skill, ms));
    this.queue = result.catch(() => {});
    return result;
  }
}
export const engine = new Engine();
