import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
const directory = await mkdtemp(join(tmpdir(), 'stride-tests-'));
for (const name of ['dates', 'focusTimer']) {
  const source = (
    await readFile(new URL('../src/' + name + '.ts', import.meta.url), 'utf8')
  ).replace("'./dates'", "'./dates.mjs'");
  await writeFile(
    join(directory, name + '.mjs'),
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText,
  );
}
const { reducer, defaults } = await import(join(directory, 'focusTimer.mjs'));
test('background elapsed time comes from deadline rather than tick count', () => {
  const state = { ...defaults, isActive: true, timeLeft: 1500, deadline: Date.now() + 60000 };
  const next = reducer(state, { type: 'tick' });
  assert.ok(next.timeLeft <= 60 && next.timeLeft >= 59);
});
test('completed work is counted once, including after reopening an expired timer', () => {
  const next = reducer(
    { ...defaults, isActive: true, deadline: Date.now() - 1000 },
    { type: 'tick' },
  );
  assert.equal(next.sessionsCompleted, 1);
  assert.equal(next.todaySessions, 1);
  assert.equal(next.isActive, false);
  assert.equal(reducer(next, { type: 'tick' }).sessionsCompleted, 1);
});
test('break completion does not count as work', () => {
  const next = reducer(
    { ...defaults, mode: 'short', isActive: true, deadline: Date.now() - 1 },
    { type: 'tick' },
  );
  assert.equal(next.sessionsCompleted, 0);
});
test('daily counter resets without losing lifetime sessions', () => {
  const next = reducer(
    { ...defaults, day: '2000-01-01', todaySessions: 8, sessionsCompleted: 20 },
    { type: 'tick' },
  );
  assert.equal(next.todaySessions, 0);
  assert.equal(next.sessionsCompleted, 20);
});
test('technique changes reset paused timer to the Android duration', () => {
  const next = reducer({ ...defaults, isActive: true }, { type: 'technique', value: 'rule52' });
  assert.equal(next.timeLeft, 3120);
  assert.equal(next.isActive, false);
  assert.equal(reducer(next, { type: 'mode', value: 'short' }).timeLeft, 1020);
});
