#!/usr/bin/env node
/**
 * Lucid CLI Tool — pure CLI for def-use contract analysis.
 *
 * Usage:
 *   node out/cli.js analyze <file_path> [--variable <state_name>]
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeFile } from './core/analyze';

function showUsage() {
  console.log('Lucid Code Observatory CLI');
  console.log('Usage:');
  console.log('  node out/cli.js analyze <file_path> [--variable <state_name>]');
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showUsage();
  }

  const command = args[0];
  if (command !== 'analyze') {
    console.error(`Unknown command: ${command}`);
    showUsage();
  }

  const fileArg = args[1];
  if (!fileArg) {
    console.error('Missing file path.');
    showUsage();
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Parse --variable argument
  let targetVariable: string | undefined;
  const varIndex = args.indexOf('--variable');
  if (varIndex !== -1 && varIndex + 1 < args.length) {
    targetVariable = args[varIndex + 1];
  }

  try {
    const contracts = analyzeFile(filePath, targetVariable);

    const formatted = contracts.map(c => ({
      state: c.variableName,
      write_sites: c.writeSites.map(ws => ({
        function: ws.enclosingFunction,
        line: ws.line,
      })),
      use_sites: c.useSites.map(us => ({
        function: us.enclosingFunction,
        line: us.line,
      })),
      triggered_by: c.triggeredBy.map(tb => ({
        event: tb.event,
        line: tb.line,
      })),
    }));

    if (formatted.length === 0) {
      console.log(JSON.stringify([], null, 2));
    } else if (formatted.length === 1 && !targetVariable) {
      console.log(JSON.stringify(formatted[0], null, 2));
    } else {
      console.log(JSON.stringify(formatted, null, 2));
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
