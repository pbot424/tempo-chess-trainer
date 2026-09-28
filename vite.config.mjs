import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { coachConfig } from './server/coach-config.mjs';
import { createCoachMiddleware } from './server/coach.mjs';
export default defineConfig(({mode,command})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const getConfig=()=>coachConfig({...env,...process.env});
  return {define:{__LOCAL_COACH__:JSON.stringify(command==='serve' || mode==='coach')},plugins:[react(),{name:'tempo-coach-api',configureServer(server){server.middlewares.use(createCoachMiddleware({getConfig}));}}]};
});
