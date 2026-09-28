export function coachConfig(env = process.env) {
  const provider = env.COACH_PROVIDER || 'ollama';
  return {provider,binary:env.CODEX_BIN || 'codex',key:env.OPENAI_API_KEY || '',
    model:provider === 'ollama' ? env.OLLAMA_MODEL || 'qwen3.5:9b' : env.OPENAI_MODEL || 'gpt-6-astra'};
}
