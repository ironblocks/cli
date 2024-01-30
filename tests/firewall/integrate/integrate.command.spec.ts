// Builtin.
import * as assert from 'assert';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
// 3rd party.
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import * as sinon from 'sinon';
import { SinonSandbox, SinonStub } from 'sinon';
// Internal.
import { AppModule } from '../../../src/app/app.module';
import { FirewallIntegrateUtils } from '../../../src/firewall/integrate/integrate.utils';
import { replaceCRLF, replaceSingleSpace } from '../../lib/utils';

export function FirewallIntegrateCommandTestSuite() {
    describe('Firewall Integreate Command', CommandTestSuite.bind(this));
}

function CommandTestSuite() {
    const EXAMPLES_OUTPUT_DIR = path.join(__dirname, 'example-files', 'output');

    let sandbox: SinonSandbox;
    let exitStub: SinonStub;
    let stdoutStub: SinonStub;
    let stderrtStub: SinonStub;
    let writeFileStub: SinonStub;
    let commandInstance: TestingModule;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        exitStub = sandbox.stub(process, 'exit');
        stdoutStub = sandbox.stub(process.stdout, 'write');
        stderrtStub = sandbox.stub(process.stderr, 'write');
        writeFileStub = sandbox.stub(fsPromises, 'writeFile');
        stubPathResolve();
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule],
        }).compile();
    });

    function stubPathResolve() {
        const original = path.resolve;
        sandbox.stub(path, 'resolve').callsFake((...path) => original(__dirname, ...path));
    }

    afterEach(() => {
        sandbox.restore();
    });

    function assertHelpText(text: string): void {
        text = replaceSingleSpace(text);
        assert(
            text.includes("Integrate your contracts with Ironblocks' firewall"),
            'Missing command description',
        );
        assert(
            text.includes('-f, --file <string> path to contract file to customize'),
            'Missing file option flag',
        );
        assert(
            text.includes('-d, --dir <string> path to contracts directory to customize'),
            'Missing directory option flag',
        );
        assert(
            text.includes(
                '-r, --rec recurse on all the contract files in the directory (default: false)',
            ),
            'Missing recursive option flag',
        );
        assert(
            text.includes(
                '-i, --internal whether to add firewall protection for "internal" functions (default: false)',
            ),
            'Missing internal modifiers option flag',
        );
        assert(
            text.includes('-m, --modifiers <string...> set advanced modifiers'),
            'Missing advanced modifiers option flag',
        );
        assert(text.includes('-h, --help display help for command'), 'Missing help option flag');
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

    it('it should fail for a non existing file', async () => {
        await CommandTestFactory.run(commandInstance, [
            'fw',
            'integ',
            '-f',
            './bad/path/to/file.sol',
        ]);

        const errText = stderrtStub.firstCall?.args[0];
        assert(errText.includes('error: file does not exist'), 'Missing error message');
        const exitCode = exitStub.firstCall?.args[0];
        assert.equal(exitCode, 1, 'process should exit with 1');
    });

    it('it should fail for a non-solidity file', async () => {
        await CommandTestFactory.run(commandInstance, [
            'fw',
            'integ',
            '-f',
            './example-files/input/not-solidity.js',
        ]);

        const errText = stderrtStub.firstCall?.args[0];
        assert(errText.includes('error: not a solidity file'), 'Missing error message');
        const exitCode = exitStub.firstCall?.args[0];
        assert.equal(exitCode, 1, 'process should exit with 1');
    });

    describe('file', () => {
        async function assertCustomized(expectedOutput: string): Promise<void> {
            const customizedFilePath = writeFileStub.firstCall?.args[0];
            const actualCustomized = writeFileStub.firstCall?.args[1];
            const expectedCustomized = expectedOutput;
            assert(actualCustomized);
            assert.equal(replaceCRLF(actualCustomized), replaceCRLF(expectedCustomized));
            const outputText = stdoutStub.firstCall?.args[0];
            assert(outputText.includes('Customized file'), 'Missing success message');
            assert(outputText.includes(customizedFilePath), 'Missing filepath success message');
        }

        describe('StandAlone', () => {
            it('it should add external firewall modifiers to external functions', async () => {
                sandbox
                    .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
                    .resolves();
                await CommandTestFactory.run(commandInstance, [
                    'fw',
                    'integ',
                    '-f',
                    './example-files/input/Standalone.sol',
                ]);

                const expectedCustomized = (
                    await fsPromises.readFile(
                        path.join(EXAMPLES_OUTPUT_DIR, 'external-only/Standalone.sol'),
                    )
                ).toString();
                await assertCustomized(expectedCustomized);
            });

            it('it should add external and internal firewall modifiers to external functions', async () => {
                sandbox
                    .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
                    .resolves();
                await CommandTestFactory.run(commandInstance, [
                    'fw',
                    'integ',
                    '-f',
                    './example-files/input/Standalone.sol',
                    '-i',
                ]);

                const expectedCustomized = (
                    await fsPromises.readFile(
                        path.join(EXAMPLES_OUTPUT_DIR, 'external-internal/Standalone.sol'),
                    )
                ).toString();
                await assertCustomized(expectedCustomized);
            });
        });

        describe('MultipleInheritance', () => {
            it('it should add external firewall modifiers to external functions', async () => {
                sandbox
                    .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
                    .resolves();
                await CommandTestFactory.run(commandInstance, [
                    'fw',
                    'integ',
                    '-f',
                    './example-files/input/MultipleInheritance.sol',
                ]);

                const expectedCustomized = (
                    await fsPromises.readFile(
                        path.join(EXAMPLES_OUTPUT_DIR, 'external-only/MultipleInheritance.sol'),
                    )
                ).toString();
                await assertCustomized(expectedCustomized);
            });
        });

        describe('PartiallyAbstract', () => {
            it('it should add external firewall modifiers to external functions', async () => {
                sandbox
                    .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
                    .resolves();
                await CommandTestFactory.run(commandInstance, [
                    'fw',
                    'integ',
                    '-f',
                    './example-files/input/PartiallyAbstract.sol',
                ]);

                const expectedCustomized = (
                    await fsPromises.readFile(
                        path.join(EXAMPLES_OUTPUT_DIR, 'external-only/PartiallyAbstract.sol'),
                    )
                ).toString();
                await assertCustomized(expectedCustomized);
            });
        });

        describe('FullyAbstract', () => {
            it('it should not customize contract', async () => {
                sandbox
                    .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
                    .resolves();
                await CommandTestFactory.run(commandInstance, [
                    'fw',
                    'integ',
                    '-f',
                    './example-files/input/FullyAbstract.sol',
                ]);

                assert.equal(writeFileStub.callCount, 0);
                const outputText = stdoutStub.firstCall?.args[0];
                assert(outputText.includes('File was not changed'), 'Missing success message');
            });
        });
    });
}
