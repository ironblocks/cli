// Builtin.
import * as assert from 'assert';
// 3rd party.
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import * as sinon from 'sinon';
import { SinonSandbox, SinonStub } from 'sinon';
// Internal.
import { AppModule } from '../../src/app/app.module';
import { replaceSingleSpace } from '../lib/utils';
import { FirewallIntegrateCommandTestSuite } from './integrate/integrate.command.spec';

export function FirewallCommandTestSuite() {
    describe('Firewall Command', CommandTestSuite.bind(this));

    FirewallIntegrateCommandTestSuite();
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
        text = replaceSingleSpace(text);
        assert(text.includes('Firewall utilities for developers'), 'Missing command description');
        assert(text.includes('-h, --help display help for command'), 'Missing help option flag');
        assert(
            text.includes("integ [options] Integrate your contracts with Ironblocks' firewall"),
            'Missing firewall integrate command',
        );
    }

    it("it should display firewall command's help", async () => {
        await CommandTestFactory.run(commandInstance, ['fw']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display firewall command's help with -h", async () => {
        await CommandTestFactory.run(commandInstance, ['fw', '-h']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });

    it("it should display firewall command's help with --help", async () => {
        await CommandTestFactory.run(commandInstance, ['fw', '--help']);
        const helpText = stdoutStub.firstCall?.args[0];
        const exitCode = exitStub.firstCall?.args[0];
        assertHelpText(helpText);
        assert.equal(exitCode, 0, 'process should exit with 0');
    });
}
