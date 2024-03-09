import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';

import { AppModule } from '@/app/app.module';
import { FrameworkService } from '@/framework/framework.service';

describe('Sub-Command Option: integ --file', () => {
    let commandInstance: TestingModule;
    let exitSpy: jest.SpyInstance;
    let stdoutSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;
    let FrameworkDependenciesService;

    beforeEach(async () => {
        FrameworkDependenciesService = {
            assertDependencies: jest.fn()
        };

        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule]
        })
            .overrideProvider(FrameworkService)
            .useValue(FrameworkDependenciesService)
            .compile();

        exitSpy = jest.spyOn(process, 'exit').mockImplementation();
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
        stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
    });

    afterEach(async () => {
        exitSpy.mockRestore();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });

    it('displays an error message for a non existing file', async () => {
        const badFilePath = './bad/path/to/file.sol';
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', '-f', badFilePath]);

        const commandOutput = stderrSpy.mock.calls[0][0];
        expect(commandOutput).toContain(`File does not exist`);
    });

    // it('it should fail for a non-solidity file', async () => {
    //     await CommandTestFactory.run(commandInstance, [
    //         'fw',
    //         'integ',
    //         '-f',
    //         './example-files/input/not-solidity.js',
    //     ]);

    //     const errText = stderrtStub.firstCall?.args[0];
    //     assert(errText.includes('error: not a solidity file'), 'Missing error message');
    //     const exitCode = exitStub.firstCall?.args[0];
    //     assert.equal(exitCode, 1, 'process should exit with 1');
    // });

    // describe('file', () => {
    //     async function assertCustomized(expectedOutput: string): Promise<void> {
    //         const customizedFilePath = writeFileStub.firstCall?.args[0];
    //         const actualCustomized = writeFileStub.firstCall?.args[1];
    //         const expectedCustomized = expectedOutput;
    //         assert(actualCustomized);
    //         assert.equal(replaceCRLF(actualCustomized), replaceCRLF(expectedCustomized));
    //         const outputText = stdoutStub.firstCall?.args[0];
    //         assert(outputText.includes('Customized file'), 'Missing success message');
    //         assert(outputText.includes(customizedFilePath), 'Missing filepath success message');
    //     }

    //     describe('StandAlone', () => {
    //         it('it should add external firewall modifiers to external functions', async () => {
    //             sandbox
    //                 .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
    //                 .resolves();
    //             await CommandTestFactory.run(commandInstance, [
    //                 'fw',
    //                 'integ',
    //                 '-f',
    //                 './example-files/input/Standalone.sol',
    //             ]);

    //             const expectedCustomized = (
    //                 await fsPromises.readFile(
    //                     path.join(EXAMPLES_OUTPUT_DIR, 'external-only/Standalone.sol'),
    //                 )
    //             ).toString();
    //             await assertCustomized(expectedCustomized);
    //         });

    //         it('it should add external and internal firewall modifiers to external functions', async () => {
    //             sandbox
    //                 .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
    //                 .resolves();
    //             await CommandTestFactory.run(commandInstance, [
    //                 'fw',
    //                 'integ',
    //                 '-f',
    //                 './example-files/input/Standalone.sol',
    //                 '-i',
    //             ]);

    //             const expectedCustomized = (
    //                 await fsPromises.readFile(
    //                     path.join(EXAMPLES_OUTPUT_DIR, 'external-internal/Standalone.sol'),
    //                 )
    //             ).toString();
    //             await assertCustomized(expectedCustomized);
    //         });
    //     });

    //     describe('MultipleInheritance', () => {
    //         it('it should add external firewall modifiers to external functions', async () => {
    //             sandbox
    //                 .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
    //                 .resolves();
    //             await CommandTestFactory.run(commandInstance, [
    //                 'fw',
    //                 'integ',
    //                 '-f',
    //                 './example-files/input/MultipleInheritance.sol',
    //             ]);

    //             const expectedCustomized = (
    //                 await fsPromises.readFile(
    //                     path.join(EXAMPLES_OUTPUT_DIR, 'external-only/MultipleInheritance.sol'),
    //                 )
    //             ).toString();
    //             await assertCustomized(expectedCustomized);
    //         });
    //     });

    //     describe('PartiallyAbstract', () => {
    //         it('it should add external firewall modifiers to external functions', async () => {
    //             sandbox
    //                 .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
    //                 .resolves();
    //             await CommandTestFactory.run(commandInstance, [
    //                 'fw',
    //                 'integ',
    //                 '-f',
    //                 './example-files/input/PartiallyAbstract.sol',
    //             ]);

    //             const expectedCustomized = (
    //                 await fsPromises.readFile(
    //                     path.join(EXAMPLES_OUTPUT_DIR, 'external-only/PartiallyAbstract.sol'),
    //                 )
    //             ).toString();
    //             await assertCustomized(expectedCustomized);
    //         });
    //     });

    //     describe('FullyAbstract', () => {
    //         it('it should not customize contract', async () => {
    //             sandbox
    //                 .stub(FirewallIntegrateUtils.prototype, 'npmInstallFirewallConsumerIfNeeded')
    //                 .resolves();
    //             await CommandTestFactory.run(commandInstance, [
    //                 'fw',
    //                 'integ',
    //                 '-f',
    //                 './example-files/input/FullyAbstract.sol',
    //             ]);

    //             assert.equal(writeFileStub.callCount, 0);
    //             const outputText = stdoutStub.firstCall?.args[0];
    //             assert(outputText.includes('File was not changed'), 'Missing success message');
    //         });
    //     });
    // });
});
