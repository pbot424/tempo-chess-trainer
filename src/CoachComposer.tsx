import { useEffect, useState } from "react";
import { Send, Square } from "lucide-react";
import type { GameState } from "./useGame";
export default function CoachComposer({state}:{state:GameState}) {
  const [provider,setProvider]=useState("ollama");
  const [draft,setDraft]=useState("");
  const [status,setStatus]=useState<"loading"|"ready"|"unavailable">("loading");
  async function check() {
    setStatus("loading");
    try { const res=await fetch('/api/coach/status'); const data=await res.json(); setProvider(data.provider || 'openai'); setStatus(res.ok&&data.configured?'ready':'unavailable'); }
    catch {setStatus('unavailable');}
  }
  useEffect(()=>{void check();},[]);
  async function submit() {
    const sent=draft.trim();
    if(!sent||state.busy||state.coachBusy)return;
    if(await state.askConversational(sent))setDraft((current)=>current.trim()===sent?'':current);
  }
  return <div className="coach-composer">
    <form onSubmit={(e)=>{e.preventDefault();void submit();}}>
      <label htmlFor="coach-question">Tell me what you were thinking</label>
      <textarea id="coach-question" maxLength={1200} rows={2} value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="I thought that trade would help my attack. What did I miss?" />
      <div className="composer-actions"><small>{status==='ready'?(provider==='ollama'?'Runs on your computer with Ollama. No ChatGPT or Codex allowance used.':provider==='codex'?'Uses your Codex login and usage allowance. Your question and game context are sent to OpenAI.':'Your question, position and recent conversation are sent to OpenAI.'):status==='loading'?'Checking coach connection…':provider==='ollama'?'Local coach is unavailable. Start Ollama and check that the model is installed.':provider==='codex'?'Coach is not connected. Sign into the Codex CLI with ChatGPT, then check again.':'Coach is not connected. Check the server API configuration.'}</small>
        {state.coachBusy?<button key="stop" type="button" onClick={(event)=>{event.preventDefault();state.cancelCoach();}} aria-label="Stop coach reply"><Square size={14}/></button>:<button key="send" type="submit" aria-label="Ask coach" disabled={status!=='ready'||!draft.trim()||state.busy}><Send size={16}/></button>}
      </div>
    </form>
    {status==='unavailable'&&<button className="text-link" onClick={()=>void check()}>Check connection again</button>}
    {state.coachError&&<p className="coach-request-error" role="alert">{state.coachError}</p>}
  </div>;
}
