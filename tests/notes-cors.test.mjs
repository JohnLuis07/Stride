import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source = await readFile(
  new URL('../supabase/functions/notes-ai/index.ts', import.meta.url),
  'utf8',
);
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;
function handler(origins) {
  let serve;
  vm.runInNewContext(code, {
    Deno: {
      env: {
        get: (name) =>
          ({
            SUPABASE_URL: 'https://example.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service',
            SUPABASE_ANON_KEY: 'test-anon',
            NOTE_AI_ALLOWED_ORIGINS: origins,
          })[name],
      },
      serve: (fn) => {
        serve = fn;
      },
    },
    Response,
    Request,
    Headers,
    URL,
    TextEncoder,
    TextDecoder,
    AbortSignal,
    crypto,
    console,
  });
  return serve;
}
const preflight = (origin) =>
  new Request('https://example.supabase.co/functions/v1/notes-ai', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-client-info',
    },
  });
test('allowed web preflight accepts SDK headers without an auth token', async () => {
  const response = await handler('https://stride.example')(preflight('https://stride.example'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://stride.example');
  const allowed = response.headers
    .get('access-control-allow-headers')
    .split(',')
    .map((v) => v.trim());
  for (const header of ['authorization', 'apikey', 'content-type', 'x-client-info'])
    assert.ok(allowed.includes(header));
  assert.ok(response.headers.get('access-control-allow-methods').includes('POST'));
});
test('configured trailing slash and whitespace do not block the same origin', async () => {
  const response = await handler(' https://stride.example/ , http://localhost:5173/ ')(
    preflight('http://localhost:5173'),
  );
  assert.equal(response.status, 200);
});
test('unlisted origins are still rejected', async () => {
  const response = await handler('https://stride.example')(preflight('https://untrusted.example'));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
test('allowed CORS does not bypass authentication on POST', async () => {
  const response = await handler('https://stride.example')(
    new Request('https://example.supabase.co/functions/v1/notes-ai', {
      method: 'POST',
      headers: { Origin: 'https://stride.example', 'Content-Type': 'application/json' },
      body: '{"action":"overview"}',
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://stride.example');
  assert.equal((await response.json()).error, 'SESSION_EXPIRED');
});

test('production Stride origin is the default when no origins secret is set', async () => {
  const response = await handler('')(preflight('https://stride-psi-fawn.vercel.app'));
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://stride-psi-fawn.vercel.app',
  );
});
test('an explicit origins secret overrides the production default', async () => {
  const response = await handler('https://stride.example')(
    preflight('https://stride-psi-fawn.vercel.app'),
  );
  assert.equal(response.status, 403);
});
