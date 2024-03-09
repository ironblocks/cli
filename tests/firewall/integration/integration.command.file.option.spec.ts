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
});
