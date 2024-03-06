import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';

import { AppModule } from '../../src/app/app.module';
import { DESCRIPTION } from '../../src/app/app.command.descriptor';


describe('Command: ib', () => {
    let commandInstance: TestingModule;
    let exitSpy: jest.SpyInstance;
    let stdoutSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;

    beforeEach(async () => {
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule],
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

    it('displays usage information if no command is specified', async () => {
        await CommandTestFactory.run(commandInstance);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain('Usage: ib [options] [command]');
    });

    it('displays the logo in the usage information', async () => {
        await CommandTestFactory.run(commandInstance);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain(`${DESCRIPTION}`);
    });

    it('displays an error message if an invalid command is specified', async () => {
        await CommandTestFactory.run(commandInstance, ['invalid-command']);

        const commandOutput = stderrSpy.mock.calls[0][0];
        expect(commandOutput).toContain('Invalid command: invalid-command');
    });

    it('exits with a non-zero exit code if an invalid command is specified', async () => {
        await CommandTestFactory.run(commandInstance, ['invalid-command']);
        expect(process.exitCode).toBe(1);

        process.exitCode = 0;
    });
});
