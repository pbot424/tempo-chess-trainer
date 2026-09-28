import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { codexResponse, codexStatus } from './codex-provider.mjs';
const options = () => ({body:JSON.stringify({instructions:'Coach only.',input:'Untrusted question: $(touch unwanted)',text:{format:{schema:{type:'object'}}}})});
async function fixture(t, body) {
  const dir=await mkdtemp(join(tmpdir(),'tempo-provider-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const binary=join(dir,'codex');
  await writeFile(binary,`#!${process.execPath}\n${body}`);await chmod(binary,0o700);return binary;
}
test('CLI wrapper passes input on stdin and uses isolated ephemeral read-only execution',async(t)=>{
  const binary=await fixture(t,`
    const fs=require('fs');const args=process.argv.slice(2);
    if(!args.includes('--ephemeral')||!args.includes('--ignore-user-config')||args[args.indexOf('--sandbox')+1]!=='read-only')process.exit(2);
    let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
      if(!input.includes('$(touch unwanted)'))process.exit(3);
      fs.writeFileSync(args[args.indexOf('--output-last-message')+1],JSON.stringify({reflection:'Your idea is activity.',observation:'Check protection.',question:'What did you notice?'}));
    });
  `);
  const response=await codexResponse('',options(),{binary});
  assert.equal((await response.json()).status,'completed');
});
test('CLI availability requires ChatGPT login and handles missing executable',async(t)=>{
  const binary=await fixture(t,`console.error('Logged in using ChatGPT');`);
  assert.equal(await codexStatus(binary),true);
  assert.equal(await codexStatus('/nonexistent/tempo-codex'),false);
  await assert.rejects(codexResponse('',options(),{binary:'/nonexistent/tempo-codex'}),/could not start/);
});
test('cancelling a running wrapper terminates the request promptly',async(t)=>{
  const binary=await fixture(t,`setInterval(()=>{},1000);`);
  const controller=new AbortController();
  const response=codexResponse('',{...options(),signal:controller.signal},{binary});
  const timer=setTimeout(()=>controller.abort(),150);t.after(()=>clearTimeout(timer));
  await assert.rejects(response,/cancelled|abort/i);
});
