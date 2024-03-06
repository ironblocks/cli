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


describe('Root Command', () => {
    let sandbox: SinonSandbox;
    let exitStub: SinonStub;
    let stdoutStub: SinonStub;
    let commandInstance: TestingModule;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        exitStub = sandbox.stub(process, 'exit');
        stdoutStub = sandbox.stub(process.stdout, 'write');
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule],
        }).compile();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function assertHelpText(text: string): void {
        text = replaceSingleSpace(text);
        assert(text.includes('ironblocks CLI tool'), 'Missing command description');
        assert(text.includes('-h, --help display help for command'), 'Missing help option flag');
        assert(text.includes('fw Firewall utilities for developers'), 'Missing firewall command');
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
});
