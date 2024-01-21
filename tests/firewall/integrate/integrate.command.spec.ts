// Builtin.
import * as assert from 'assert';
// 3rd party.
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import * as sinon from 'sinon';
import { SinonSandbox, SinonStub } from 'sinon';
// Internal.
import { AppModule } from '../../../src/app/app.module';

export function FirewallIntegrateCommandTestSuite() {
    describe('Firewall Integreate Command', CommandTestSuite.bind(this));
}

function CommandTestSuite() {
    let sandbox: SinonSandbox;
    let stdoutStub: SinonStub;
    let stderrStub: SinonStub;
    let exitStub: SinonStub;
    let commandInstance: TestingModule;

    before(async () => {
        sandbox = sinon.createSandbox();
        stdoutStub = sandbox.stub(process.stdout, 'write');
        stderrStub = sandbox.stub(process.stderr, 'write');
        exitStub = sandbox.stub(process, 'exit');
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule],
        }).compile();
    });

    afterEach(() => {
        stdoutStub.reset();
        stderrStub.reset();
        exitStub.reset();
    });

    after(() => {
        sandbox.restore();
    });

    function assertHelpText(text: string): void {
        assert(
            text.includes("Integrate your contracts with Ironblocks' firewall"),
            'Missing command description',
        );
        assert(
            text.includes('-f, --file <string>          path to contract file to customize'),
            'Missing file option flag',
        );
        assert(
            text.includes('-d, --dir <string>           path to contracts directory to customize'),
            'Missing directory option flag',
        );
        assert(
            text.includes(
                '-r, --rec                    recurse on all the contract files in the directory (default: false)',
            ),
            'Missing recursive option flag',
        );
        assert(
            text.includes(
                '-i, --internal               whether to add firewall protection for "internal" functions (default: false)',
            ),
            'Missing internal modifiers option flag',
        );
        assert(
            text.includes('-m, --modifiers <string...>  set advanced modifiers'),
            'Missing advanced modifiers option flag',
        );
        assert(
            text.includes('-h, --help                   display help for command'),
            'Missing help option flag',
        );
    }

    it("it should display firewall integrate command's help", async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display firewall integrate command's help with -h", async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', '-h']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display firewall integrate command's help with --help", async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', '--help']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });
}
