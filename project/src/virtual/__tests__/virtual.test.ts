/**
 * Tests: virtual layout, pull/push round-trip, fork.
 */

import * as fs from 'fs';
import * as path from 'path';
import { layoutDefUseDocument } from '../layout';
import { buildDefUseSlice } from '../../projection/def-use-slice';
import { createDefUseSession, pullSession } from '../session';
import { pushOverlay } from '../push';
import { forkFunctionInFile, suggestForkName } from '../fork';
import { readSourceLines } from '../extract';
import { saveFoldState } from '../fold-store';

const FIX = path.join(__dirname, 'fixtures');
const WS = path.join(FIX, 'ws');

function setup() {
  fs.mkdirSync(WS, { recursive: true });
  const src = `function demo() {
  let count = 0;
  function bump() {
    count += 1;
  }
  function read() {
    return count;
  }
  return { bump, read };
}
`;
  fs.writeFileSync(path.join(FIX, 'push.ts'), src);
}

function cleanup() {
  if (fs.existsSync(FIX)) {
    fs.rmSync(FIX, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Virtual Layer Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const filePath = path.join(FIX, 'push.ts');

  console.log('Test 1: layout produces segments and display headers');
  try {
    const slice = buildDefUseSlice(filePath, 'count');
    const doc = layoutDefUseDocument(slice!, filePath, new Set());
    if (doc.text.includes('// ---') && doc.segments.length > 0) {
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

  console.log('\nTest 2: fold collapses function region');
  try {
    const slice = buildDefUseSlice(filePath, 'count');
    const doc = layoutDefUseDocument(slice!, filePath, new Set(['bump']));
    const collapsed = doc.segments.some(s => s.enclosingFunction === 'bump' && s.collapsed);
    if (collapsed && doc.text.includes('[collapsed]')) {
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

  console.log('\nTest 3: push overlay round-trip (save_selected)');
  try {
    const fresh = `function demo() {
  let count = 0;
  function bump() {
    count += 1;
  }
  return count;
}
`;
    fs.writeFileSync(filePath, fresh);
    let session = createDefUseSession(filePath, 'count', WS)!;
    const writeSeg = session.document.segments.find(s => s.kind === 'write' && !s.collapsed);
    if (!writeSeg) {
      throw new Error('no write segment');
    }
    const lines = session.document.text.split(/\r?\n/);
    lines[writeSeg.virtualStartLine - 1] = '    count += 2;';
    const edited = lines.join('\n');
    session = { ...session, selectedSegmentIds: new Set([writeSeg.id]) };
    const result = pushOverlay(session, edited, 'selected');
    const source = readSourceLines(filePath);
    const line = source[writeSeg.sourceLine - 1];
    if (result.updatedLines === 1 && line.includes('count += 2')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', line, result);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 4: pull rebuilds after external change');
  try {
    const session = createDefUseSession(filePath, 'count', WS)!;
    const pulled = pullSession(session, WS);
    if (pulled.document.text.length > 0) {
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

  console.log('\nTest 5: fork function same file (fooPrime)');
  try {
    const forkFile = path.join(FIX, 'fork.ts');
    fs.writeFileSync(
      forkFile,
      `function shared() { return 1; }\nfunction consumer() { return shared(); }\n`,
    );
    const newName = suggestForkName('shared', 'function');
    const result = forkFunctionInFile(forkFile, 'shared', newName);
    const text = fs.readFileSync(forkFile, 'utf8');
    if (result && newName === 'sharedPrime' && text.includes(`function ${newName}`)) {
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

  console.log('\nTest 6: fold state persists under .lucid/state/{stateName}/');
  try {
    saveFoldState(WS, 'count', new Set(['bump']));
    const p = path.join(WS, '.lucid', 'state', 'count', 'fold.json');
    if (fs.existsSync(p)) {
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

  cleanup();
  console.log(`\n=== Virtual Layer Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
