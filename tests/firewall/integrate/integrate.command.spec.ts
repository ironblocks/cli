import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';

import { AppModule } from '../../../src/app/app.module';
import { DESCRIPTION, NAME } from '../../../src/firewall/integrate/integrate.command.descriptor';

describe('Sub-Command: integ', () => {
    let commandInstance: TestingModule;
    let exitSpy: jest.SpyInstance;
    let stdoutSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;

    beforeEach(async () => {
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule]
        }).compile();

        exitSpy = jest.spyOn(process, 'exit').mockImplementation();
        stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
        stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation();
    });

    afterEach(async () => {
        exitSpy.mockRestore();
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
    });

    it('displays an error message if both -d and -f flags are missing', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ']);

        const commandOutput = stderrSpy.mock.calls[0][0];
        expect(commandOutput).toContain('No file or directory specified');
    });

    it('exits with a non-zero exit code if both -d and -f flags are missing', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ']);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('displays the description in the usage information', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', '--help']);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain(DESCRIPTION);
    });

    it('displays the name of the command in the usage information', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', '--help']);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain(NAME);
    });

    it('displays an error message if an invalid command is specified', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', 'invalid-command']);

        const commandOutput = stderrSpy.mock.calls[0][0];
        expect(commandOutput).toContain('Invalid command: invalid-command');
    });

    it('exits with a non-zero exit code if an invalid command is specified', async () => {
        await CommandTestFactory.run(commandInstance, ['fw', 'integ', 'invalid-command']);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
