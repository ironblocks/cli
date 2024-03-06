// Builtin.
import * as assert from 'assert';
// 3rd party.
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
// Internal.
import { AppModule } from '../../src/app/app.module';
import { DESCRIPTION } from '../../src/app/app.command.descriptor';


describe('Command: ib', () => {
    let commandInstance: TestingModule;
    let exitSpy: jest.SpyInstance;
    let writeSpy: jest.SpyInstance;

    beforeEach(async () => {
        commandInstance = await CommandTestFactory.createTestingCommand({
            imports: [AppModule],
        }).compile();

        exitSpy = jest.spyOn(process, 'exit').mockImplementation();
        writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    });

    afterEach(async () => {
        exitSpy.mockRestore();
        writeSpy.mockRestore();
    });

    it("displays usage information if no command is specified", async () => {
        await CommandTestFactory.run(commandInstance);

        const commandOutput = writeSpy.mock.calls[0][0];
        expect(commandOutput).toContain('Usage: ib [options] [command]');
    });

    it("displays the logo in the usage information'", async () => {
        await CommandTestFactory.run(commandInstance);

        const commandOutput = writeSpy.mock.calls[0][0];
        expect(commandOutput).toContain(`${DESCRIPTION}`);
    });
});
