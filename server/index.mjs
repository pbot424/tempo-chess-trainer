import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { loadEnvFile } from 'node:process';
import { coachConfig } from './coach-config.mjs';
import { createCoachMiddleware } from './coach.mjs';
try {loadEnvFile('.env.local');} catch(error){if(error.code!=='ENOENT')throw error;}
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'};
const api=createCoachMiddleware({getConfig:()=>coachConfig()});
createServer((req,res)=>api(req,res,async()=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if(pathname==='/'||!extname(pathname))file=resolve(root,'index.html');
    if(!(await stat(file)).isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
})).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Tempo production server: http://127.0.0.1:'+(process.env.PORT||4173)));
