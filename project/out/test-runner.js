"use strict";
/**
 * Test runner to execute all unit and integration tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parser_test_1 = require("./ingestion/__tests__/parser.test");
const symbols_test_1 = require("./ingestion/__tests__/symbols.test");
const write_sites_test_1 = require("./analysis/__tests__/write-sites.test");
const use_sites_test_1 = require("./analysis/__tests__/use-sites.test");
const contract_test_1 = require("./analysis/__tests__/contract.test");
const cli_test_1 = require("./__tests__/cli.test");
const projection_slice_test_1 = require("./projection/__tests__/projection-slice.test");
const virtual_test_1 = require("./virtual/__tests__/virtual.test");
const structure_slice_test_1 = require("./projection/__tests__/structure-slice.test");
const impact_slice_test_1 = require("./projection/__tests__/impact-slice.test");
const event_flow_slice_test_1 = require("./projection/__tests__/event-flow-slice.test");
const entry_point_slice_test_1 = require("./projection/__tests__/entry-point-slice.test");
const data_flow_slice_test_1 = require("./projection/__tests__/data-flow-slice.test");
const phase2_ui_test_1 = require("./__tests__/phase2-ui.test");
const phase2_test_1 = require("./__tests__/phase2.test");
async function main() {
    console.log('==================================================');
    console.log('             Lucid Test Suite Runner              ');
    console.log('==================================================\n');
    const testSuites = [
        { name: 'Ingestion: Parser Tests', fn: parser_test_1.runTests },
        { name: 'Ingestion: Symbol Extraction Tests', fn: symbols_test_1.runTests },
        { name: 'Analysis: Write Site Scanner Tests', fn: write_sites_test_1.runTests },
        { name: 'Analysis: Use Site Scanner Tests', fn: use_sites_test_1.runTests },
        { name: 'Analysis: Contract Builder Tests', fn: contract_test_1.runTests },
        { name: 'CLI: Command & Trigger Analysis Tests', fn: cli_test_1.runTests },
        { name: 'Projection: Def-Use Slice Tests', fn: projection_slice_test_1.runTests },
        { name: 'Virtual: Layout Push Fork Tests', fn: virtual_test_1.runTests },
        { name: 'Projection: Data Flow Slice Tests', fn: data_flow_slice_test_1.runTests },
        { name: 'Projection: Entry Point Slice Tests', fn: entry_point_slice_test_1.runTests },
        { name: 'Projection: Event Flow Slice Tests', fn: event_flow_slice_test_1.runTests },
        { name: 'Projection: Impact Slice Tests', fn: impact_slice_test_1.runTests },
        { name: 'Projection: Structure Slice Tests', fn: structure_slice_test_1.runTests },
        { name: 'Phase 2: Cross-File Trace Translation Tests', fn: phase2_test_1.runTests },
        { name: 'Phase 2: Extension UI Wiring Tests', fn: phase2_ui_test_1.runTests },
    ];
    let allSuccess = true;
    const passedSuites = [];
    const failedSuites = [];
    for (const suite of testSuites) {
        console.log(`--- Running Suite: ${suite.name} ---`);
        try {
            const success = suite.fn();
            if (success) {
                passedSuites.push(suite.name);
            }
            else {
                failedSuites.push(suite.name);
                allSuccess = false;
            }
        }
        catch (error) {
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
//# sourceMappingURL=test-runner.js.map