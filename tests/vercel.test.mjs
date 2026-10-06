import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('vercel.json publica la carpeta dist con el build del proyecto', () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(cfg.outputDirectory, 'dist');
  assert.equal(cfg.buildCommand, 'npm run build');
});
