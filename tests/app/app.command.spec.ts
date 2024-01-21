// Builtin.
import * as assert from 'assert';
// 3rd party.
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import * as sinon from 'sinon';
import { SinonSandbox, SinonStub } from 'sinon';
// Internal.
import { AppModule } from '../../src/app/app.module';
import { FirewallCommandTestSuite } from '../firewall/firewall.command.spec';

export function RootCommandTestSuite() {
    describe('Root Command', CommandTestSuite.bind(this));

    FirewallCommandTestSuite();
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
        assert(text.includes('ironblocks CLI tool'), 'Missing command description');
        assert(text.includes('-h, --help  display help for command'), 'Missing help option flag');
        assert(
            text.includes('fw          Firewall utilities for developers'),
            'Missing firewall command',
        );
    }

    it("it should display root command's help", async () => {
        await CommandTestFactory.run(commandInstance);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display root command's help with -h", async () => {
        await CommandTestFactory.run(commandInstance, ['-h']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display root command's help with --help", async () => {
        await CommandTestFactory.run(commandInstance, ['--help']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });
}
