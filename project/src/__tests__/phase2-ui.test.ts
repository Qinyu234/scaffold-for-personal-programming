/**
 * Phase 2 UI wiring tests: trace JSON, translation URI, def-use pull + trace.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseTraceEventsJson, applyTraceEvents } from '../virtual/trace-session';
import { applyTraceToSession } from '../virtual/trace-apply';
import { traceJsonPath } from '../extension/lucid-paths';
import { createDefUseSession, pullSession, relayoutSession } from '../virtual/session';
import { createTranslationSession } from '../virtual/translation';
import { sessionKey, putSession, getSession } from '../extension/session-store';

const FIX = path.join(__dirname, 'fixtures');

function setup() {
  fs.mkdirSync(path.join(FIX, 'shared'), { recursive: true });
  fs.writeFileSync(
    path.join(FIX, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: { target: 'ES2020', module: 'ESNext', strict: false, moduleResolution: 'node' },
        include: ['**/*.ts'],
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(FIX, 'shared', 'counter.ts'),
    `export let total = 0;
export function inc() { total += 1; }
`,
  );
  fs.writeFileSync(
    path.join(FIX, 'main.ts'),
    `import { total, inc } from './shared/counter';
export function run() { inc(); console.log(total); }
`,
  );
}

function cleanup() {
  if (fs.existsSync(FIX)) {
    fs.rmSync(FIX, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Phase 2 UI Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const counterFile = path.join(FIX, 'shared', 'counter.ts');
  const mainFile = path.join(FIX, 'main.ts');

  console.log('Test 1: parseTraceEventsJson');
  try {
    const events = parseTraceEventsJson(
      JSON.stringify([{ file: mainFile, line: 2, kind: 'use', variableName: 'total' }]),
    );
    if (events.length === 1 && events[0].variableName === 'total') {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED');
    failed++;
  }

  console.log('\nTest 2: translation sessionKey uses lucid://translation URI');
  try {
    const py = path.join(FIX, 'x.py');
    fs.writeFileSync(py, 'n = 1\n');
    const session = createTranslationSession({ sourceFile: py, scopeId: 'n', targetLang: 'cpp' }, FIX);
    const key = putSession(session);
    if (key.startsWith('lucid://translation/cpp/n') && getSession(key)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', key);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 3: pullSession refreshes cross-file def-use slice');
  try {
    const session = createDefUseSession(counterFile, 'total', FIX)!;
    const pulled = pullSession(session, FIX);
    const files = new Set(pulled.slice.spans.map(s => s.file));
    if (files.has(mainFile) && files.has(counterFile)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', [...files]);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 4: applyTraceEvents marks observed in relayout');
  try {
    let session = createDefUseSession(counterFile, 'total', FIX)!;
    session = applyTraceEvents(session, [
      { file: mainFile, line: 2, kind: 'use', variableName: 'total' },
    ]);
    session = relayoutSession(session, FIX);
    const observed = session.slice.spans.find(s => s.provenance === 'observed');
    if (observed && session.document.text.includes('[observed]')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 5: traceJsonPath + applyTraceToSession from file');
  try {
    const traceFile = traceJsonPath(FIX);
    fs.mkdirSync(path.dirname(traceFile), { recursive: true });
    fs.writeFileSync(
      traceFile,
      JSON.stringify([{ file: mainFile, line: 2, kind: 'use', variableName: 'total' }]),
    );
    const events = parseTraceEventsJson(fs.readFileSync(traceFile, 'utf8'));
    let session = createDefUseSession(counterFile, 'total', FIX)!;
    session = applyTraceToSession(session, events, FIX);
    if (traceFile.endsWith('.lucid\\trace.json') || traceFile.endsWith('.lucid/trace.json')) {
      if (session.traceEvents?.length === 1 && session.document.text.includes('[observed]')) {
        console.log('✓ PASSED');
        passed++;
      } else {
        console.log('✗ FAILED');
        failed++;
      }
    } else {
      console.log('✗ FAILED bad path', traceFile);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  cleanup();
  console.log(`\n=== Phase 2 UI Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
