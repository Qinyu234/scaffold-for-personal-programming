/**
 * Test runner to execute all unit and integration tests
 */

import { runTests as runParserTests } from './ingestion/__tests__/parser.test';
import { runTests as runSymbolsTests } from './ingestion/__tests__/symbols.test';
import { runTests as runWriteSitesTests } from './analysis/__tests__/write-sites.test';
import { runTests as runUseSitesTests } from './analysis/__tests__/use-sites.test';
import { runTests as runContractTests } from './analysis/__tests__/contract.test';
import { runTests as runCliTests } from './__tests__/cli.test';
import { runTests as runProjectionSliceTests } from './projection/__tests__/projection-slice.test';
import { runTests as runVirtualTests } from './virtual/__tests__/virtual.test';
import { runTests as runStructureTests } from './projection/__tests__/structure-slice.test';
import { runTests as runImpactTests } from './projection/__tests__/impact-slice.test';
import { runTests as runEventFlowTests } from './projection/__tests__/event-flow-slice.test';
import { runTests as runEntryPointTests } from './projection/__tests__/entry-point-slice.test';
import { runTests as runDataFlowTests } from './projection/__tests__/data-flow-slice.test';
import { runTests as runPhase2UiTests } from './__tests__/phase2-ui.test';
import { runTests as runPhase2Tests } from './__tests__/phase2.test';

async function main() {
  console.log('==================================================');
  console.log('             Lucid Test Suite Runner              ');
  console.log('==================================================\n');

  const testSuites = [
    { name: 'Ingestion: Parser Tests', fn: runParserTests },
    { name: 'Ingestion: Symbol Extraction Tests', fn: runSymbolsTests },
    { name: 'Analysis: Write Site Scanner Tests', fn: runWriteSitesTests },
    { name: 'Analysis: Use Site Scanner Tests', fn: runUseSitesTests },
    { name: 'Analysis: Contract Builder Tests', fn: runContractTests },
    { name: 'CLI: Command & Trigger Analysis Tests', fn: runCliTests },
    { name: 'Projection: Def-Use Slice Tests', fn: runProjectionSliceTests },
    { name: 'Virtual: Layout Push Fork Tests', fn: runVirtualTests },
    { name: 'Projection: Data Flow Slice Tests', fn: runDataFlowTests },
    { name: 'Projection: Entry Point Slice Tests', fn: runEntryPointTests },
    { name: 'Projection: Event Flow Slice Tests', fn: runEventFlowTests },
    { name: 'Projection: Impact Slice Tests', fn: runImpactTests },
    { name: 'Projection: Structure Slice Tests', fn: runStructureTests },
    { name: 'Phase 2: Cross-File Trace Translation Tests', fn: runPhase2Tests },
    { name: 'Phase 2: Extension UI Wiring Tests', fn: runPhase2UiTests },
  ];

  let allSuccess = true;
  const passedSuites: string[] = [];
  const failedSuites: string[] = [];

  for (const suite of testSuites) {
    console.log(`--- Running Suite: ${suite.name} ---`);
    try {
      const success = suite.fn();
      if (success) {
        passedSuites.push(suite.name);
      } else {
        failedSuites.push(suite.name);
        allSuccess = false;
      }
    } catch (error) {
      console.error(`Suite ${suite.name} threw an uncaught error:`, error);
      failedSuites.push(suite.name);
      allSuccess = false;
    }
    console.log('--------------------------------------------------\n');
  }

  console.log('==================================================');
  console.log('                  Test Summary                    ');
  console.log('==================================================');
  console.log(`Total Suites: ${testSuites.length}`);
  console.log(`Passed:       ${passedSuites.length}`);
  console.log(`Failed:       ${failedSuites.length}`);
  
  if (failedSuites.length > 0) {
    console.log('\nFailed Suites:');
    for (const name of failedSuites) {
      console.log(`  - ${name}`);
    }
  }
  console.log('==================================================\n');

  process.exit(allSuccess ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
