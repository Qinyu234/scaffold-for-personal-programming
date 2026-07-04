/**
 * Phase 2 tests: cross-file def-use, trace overlay, translation scaffold.
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildDefUseSliceWorkspace } from '../projection/def-use-slice';
import { layoutDefUseDocument } from '../virtual/layout';
import { mergeTraceOverlay } from '../analysis/trace-overlay';
import { createTranslationSession } from '../virtual/translation';
import { pushOverlay } from '../virtual/push';
import { createDefUseSession } from '../virtual/session';
import { SourceSpan } from '../analysis/span';

const FIX = path.join(__dirname, 'fixtures');

function setupCrossFile() {
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
export function inc() {
  total += 1;
}
`,
  );
  fs.writeFileSync(
    path.join(FIX, 'main.ts'),
    `import { total, inc } from './shared/counter';

export function run() {
  inc();
  console.log(total);
}
`,
  );
}

function cleanup() {
  if (fs.existsSync(FIX)) {
    fs.rmSync(FIX, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Phase 2 Tests...\n');
  setupCrossFile();

  let passed = 0;
  let failed = 0;
  const mainFile = path.join(FIX, 'main.ts');
  const counterFile = path.join(FIX, 'shared', 'counter.ts');

  console.log('Test 1: cross-file slice includes use site in consumer file');
  try {
    const slice = buildDefUseSliceWorkspace(counterFile, 'total', FIX);
    const files = new Set(
      slice?.spans.filter((s: SourceSpan) => s.kind === 'use').map((s: SourceSpan) => s.file),
    );
    if (slice && files.has(mainFile) && files.has(counterFile)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', { files: [...files] });
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 2: multi-file layout renders both file sections');
  try {
    const slice = buildDefUseSliceWorkspace(counterFile, 'total', FIX)!;
    const doc = layoutDefUseDocument(slice, counterFile, new Set());
    if (doc.text.includes('shared/counter') && doc.segments.some((s) => s.sourceFile === counterFile)) {
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

  console.log('\nTest 3: trace overlay marks observed spans');
  try {
    const slice = buildDefUseSliceWorkspace(counterFile, 'total', FIX)!;
    const merged = mergeTraceOverlay(slice, [
      { file: mainFile, line: 5, kind: 'use', variableName: 'total' },
    ]);
    const observed = merged.spans.find((s: SourceSpan) => s.provenance === 'observed');
    if (observed) {
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

  console.log('\nTest 4: translation session uses lucid://translation URI');
  try {
    const py = path.join(FIX, 'sample.py');
    fs.writeFileSync(py, 'total = 0\n');
    const session = createTranslationSession(
      { sourceFile: py, scopeId: 'total', targetLang: 'cpp' },
      FIX,
    );
    if (
      session.lineage.virtualUri.startsWith('lucid://translation/cpp/') &&
      session.document.text.includes('Python → C++')
    ) {
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

  console.log('\nTest 5: cross-file push updates remote file line');
  try {
    const session = createDefUseSession(counterFile, 'total', FIX)!;
    const seg = session.document.segments.find(
      (s) => s.sourceFile === counterFile && s.kind === 'write',
    );
    if (!seg) {
      throw new Error('no write segment in counter');
    }
    session.selectedSegmentIds = new Set([seg.id]);
    const lines = session.document.text.split(/\r?\n/);
    const idx = seg.virtualStartLine - 1;
    lines[idx] = '  total += 2;';
    const result = pushOverlay(session, lines.join('\n'), 'selected');
    const counterText = fs.readFileSync(counterFile, 'utf8');
    if (result.updatedFiles.includes(counterFile) && counterText.includes('total += 2')) {
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

  cleanup();
  console.log(`\n=== Phase 2 Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
