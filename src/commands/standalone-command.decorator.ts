import * as colors from 'colors';

export function StandaloneCommand(command: string) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const params = args[0];
            const userPassedAnInvalidCommand = params.length > 0;

            if (userPassedAnInvalidCommand) {
                this.logger.error(`Invalid command: ${params.join(' ')}`);
                this.command.error(`Run ${colors.bold.cyan(command + ' --help')} for usage information`);
            } else {
                await originalMethod.apply(this, args);
            }
        };

        return descriptor;
    };
}
