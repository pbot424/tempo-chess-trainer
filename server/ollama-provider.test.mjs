import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ollamaStatus,ollamaResponse} from './ollama-provider.mjs';
import {coachConfig} from './coach-config.mjs';
const schema={type:'object',properties:{question:{type:'string'}}};
const options=()=>({body:JSON.stringify({instructions:'Give hints only.',input:JSON.stringify({question:'Why?',board:'position FEN',recentPlayedMoves:['e4'],pieces:[{square:'e4',side:'white',piece:'pawn',attacked:false,directlyDefended:false}],conversation:Array.from({length:12},()=>({role:'player',text:'a'.repeat(2000)})),engineEvidence:[1,2,3,4,5,6]}),text:{format:{schema}}})});
test('default is local Ollama with explicit cloud opt-in',()=>{
 assert.equal(coachConfig({}).provider,'ollama');assert.equal(coachConfig({}).model,'qwen3.5:9b');
 assert.equal(coachConfig({COACH_PROVIDER:'codex'}).provider,'codex');
 assert.equal(coachConfig({OLLAMA_MODEL:'another:9b'}).model,'another:9b');
});
test('local availability requires the installed model, not just a running server',async()=>{
 const fetchImpl=async()=>Response.json({models:[{name:'qwen3.5:9b'}]});
 assert.equal(await ollamaStatus('qwen3.5:9b',fetchImpl),true);
 assert.equal(await ollamaStatus('missing',fetchImpl),false);
 assert.equal(await ollamaStatus('qwen3.5:9b',async()=>{throw Error('offline')}),false);
});
test('local chat uses loopback, bounded context, JSON schema and abort signal without cloud credentials',async()=>{
 const signal=new AbortController().signal;
 const result=await ollamaResponse('',{...options(),signal},{fetchImpl:async(url,request)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(request.signal,signal);assert.equal(request.headers.Authorization,undefined);
  const body=JSON.parse(request.body);assert.equal(body.think,false);assert.equal(body.options.num_ctx,8192);assert.deepEqual(body.format,schema);
  const context=JSON.parse(body.messages[1].content);assert.equal(context.conversation.length,6);assert.equal(context.conversation[0].text.length,1200);assert.equal(context.engineEvidence.length,3);assert.equal(context.board,undefined);assert.equal(context.recentPlayedMoves,undefined);assert.equal(context.pieces[0].square,undefined);assert.equal(context.pieces[0].area,'center');assert.equal(context.pieces[0].attacked,false);
  return Response.json({done:true,done_reason:'stop',message:{content:'{"question":"What changed?"}'}});
 }});
 assert.equal((await result.json()).status,'completed');
});
test('missing model and truncated replies produce actionable errors',async()=>{
 await assert.rejects(ollamaResponse('',options(),{fetchImpl:async()=>new Response('',{status:404})}),/ollama pull/);
 await assert.rejects(ollamaResponse('',options(),{fetchImpl:async()=>Response.json({done:true,done_reason:'length',message:{content:'partial'}})}),/incomplete/);
});
