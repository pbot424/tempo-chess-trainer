const endpoint = 'http://127.0.0.1:11434';
export async function ollamaStatus(model, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${endpoint}/api/tags`, {signal:AbortSignal.timeout(3000)});
    if (!response.ok) return false;
    const data = await response.json();
    return data.models?.some((entry) => entry.name === model || entry.model === model) ?? false;
  } catch { return false; }
}
export async function ollamaResponse(_url, options, {model = 'qwen3.5:9b', fetchImpl = fetch} = {}) {
  const payload = JSON.parse(options.body);
  const context = JSON.parse(payload.input);
  // Bound local context for an 18 GB Mac; the full game remains in the app.
  context.conversation = context.conversation?.slice(-6).map((entry) => ({...entry,text:entry.text.slice(0,1200)}));
  context.engineEvidence = context.engineEvidence?.slice(-3).map(({ply,piece,captured,estimatedPawnLoss}) => ({ply,piece,captured,estimatedPawnLoss}));
  // Supply measured board facts rather than asking a small model to calculate from FEN.
  // Coordinates stay in Stockfish; the explanation layer does not need candidate moves.
  delete context.board;
  delete context.recentPlayedMoves;
  context.pieces = context.pieces?.map(({square,...piece}) => ({...piece,
    area:['d4','e4','d5','e5'].includes(square)?'center':Number(square[1])>=3&&Number(square[1])<=6?'middle ranks':'home ranks'}));
  const response = await fetchImpl(`${endpoint}/api/chat`, {
    method:'POST',headers:{'Content-Type':'application/json'},signal:options.signal,
    body:JSON.stringify({model,stream:false,think:false,keep_alive:'5m',
      messages:[{role:'system',content:payload.instructions + '\nEach JSON field is spoken directly to the player as YOU. reflection means a brief acknowledgment, never internal reasoning or a description of the user. Use the supplied attacked and directlyDefended booleans literally. Undefended and attacked are different facts. Do not invent attacks, forks or pins. No board coordinates are needed. Example style: {"reflection":"You wanted more central space.","observation":"Being undefended alone does not mean a piece is under attack. Check which opposing pieces can actually reach it.","question":"What changed in its protection?"}'},{role:'user',content:JSON.stringify(context)}],
      format:payload.text.format.schema,options:{num_ctx:8192,num_predict:700,temperature:0.3}}),
  });
  if (!response.ok) throw new Error(response.status === 404 ? `Local model ${model} is missing. Run ollama pull ${model}.` : 'Ollama could not answer. Check that the local service is running.');
  const data = await response.json();
  if (!data.done || data.done_reason === 'length' || !data.message?.content) throw new Error('The local model returned an incomplete reply. Try a shorter question.');
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:data.message.content}]}]}));
}
