import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const directory = await mkdtemp(join(tmpdir(), 'stride-completion-tests-'));
const source = await readFile(new URL('../src/completionTiming.ts', import.meta.url), 'utf8');
const modulePath = join(directory, 'completionTiming.mjs');
await writeFile(
  modulePath,
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText,
);
const { completionTiming } = await import(modulePath);
const deadline = '2026-11-09T12:00:00Z';

test('previews early and late completion with a duration', () => {
  assert.equal(
    completionTiming(deadline, Date.parse('2026-11-09T10:30:00Z')),
    '1 hour 30 minutes early',
  );
  assert.equal(
    completionTiming(deadline, Date.parse('2026-11-11T15:00:00Z')),
    '2 days 3 hours late',
  );
});

test('distinguishes exact deadline and subsecond completion', () => {
  const at = Date.parse(deadline);
  assert.equal(completionTiming(deadline, at), 'on time');
  assert.equal(completionTiming(deadline, at + 500), 'less than 1 second late');
  assert.equal(completionTiming(deadline, at - 500), 'less than 1 second early');
});

test('compares absolute timestamps across timezone offsets', () => {
  assert.equal(completionTiming('2026-11-09T20:00:00+08:00', Date.parse(deadline)), 'on time');
});

test('missing or invalid timing does not fabricate a completion result', () => {
  assert.equal(completionTiming(undefined, Date.parse(deadline)), null);
  assert.equal(completionTiming('invalid', Date.parse(deadline)), null);
  assert.equal(completionTiming(deadline, NaN), null);
});
