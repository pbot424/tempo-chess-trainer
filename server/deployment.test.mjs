import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.mjs';

test('public production builds disable free-text coaching; local mode explicitly enables it', () => {
  for (const mode of ['production', 'staging']) {
    assert.equal(config({ mode, command: 'build' }).define.__LOCAL_COACH__, 'false');
  }
  assert.equal(config({ mode: 'coach', command: 'build' }).define.__LOCAL_COACH__, 'true');
  assert.equal(config({ mode: 'development', command: 'serve' }).define.__LOCAL_COACH__, 'true');
});
