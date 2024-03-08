import * as colors from 'colors';

import type { Logger } from '@/lib/logging/logger.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';

describe('StandaloneCommand Decorator', () => {
    //
    // A test command fixture to use for testing the decorator
    class TestCommand {
        wasRun = false;

        constructor(
            private readonly logger: Logger,
            private readonly command
        ) {}

        @StandaloneCommand('test')
        async run(passedParams: string[]) {
            this.wasRun = true;
        }
    }

    //
    // Some mocks we'll use for our tests
    let mockLogger: Logger;
    let mockCommand;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn()
        } as unknown as Logger;

        mockCommand = {
            error: jest.fn()
        };
    });

    afterEach(() => {
        mockLogger = null;
        mockCommand = null;
    });

    it('logs an error message when extra parameters are passed', () => {
        const command = new TestCommand(mockLogger, mockCommand);
        command.run(['extra', 'parameters']);

        expect(mockLogger.error).toHaveBeenCalledWith('Invalid command: extra parameters');
    });

    it('errors the command when extra parameters are passed', () => {
        const command = new TestCommand(mockLogger, mockCommand);
        command.run(['extra', 'parameters']);

        expect(mockCommand.error).toHaveBeenCalledWith(`Run ${colors.bold.cyan('test --help')} for usage information`);
    });

    it('cancels execution when extra parameters are passed', () => {
        const command = new TestCommand(mockLogger, mockCommand);
        command.run(['extra', 'parameters']);

        expect(command.wasRun).toBe(false);
    });

    it('runs the command when no extra parameters are passed', () => {
        const command = new TestCommand(mockLogger, mockCommand);
        command.run([]);

        expect(command.wasRun).toBe(true);
    });
});
