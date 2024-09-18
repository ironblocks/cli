import * as colors from 'colors';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';

import { AppModule } from '@/app/app.module';

const pkg = require('../../package.json');

describe('App Command Option: venn --version', () => {
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

    it('displays version information', async () => {
        await CommandTestFactory.run(commandInstance, ['--version']);

        const commandOutput = stdoutSpy.mock.calls[0][0];
        expect(commandOutput).toContain(`Venn CLI ${colors.cyan('v' + pkg.version)}`);
    });
});
