import { CommandRunner, Option, SubCommand } from 'nest-commander';

import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { EnableService } from '@/venn/enable/enable.service';
import { StandaloneCommand } from '@/commands/standalone-command.decorator';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';
import { DESCRIPTION, FULL_NAME, NAME } from '@/venn/enable/enable.command.descriptor';
import { SupportedVennPolicies } from '../supported-policies.enum';

@SubCommand({
    name: NAME,
    description: DESCRIPTION
})
export class EnableCommand extends CommandRunner {
    constructor(
        private readonly logger: LoggerService,
        private readonly enableService: EnableService,
        private readonly filesService: FilesService
    ) {
        super();
    }

    @StandaloneCommand(FULL_NAME)
    async run(passedParams: string[]): Promise<void> {
        const result = await this.enableService.enable();
        this.logger.log(`Enable command executed with result: ${result}`);
    }

    @Option({
        flags: '-c, --contracts-file <contracts-file>',
        description: 'a JSON file containing a list of contracts addresses to enable protection for',
        required: true
    })
    parseAndValidateContractsFile(value: string): string | void {
        if (this.filesService.doesFileExistSync(value)) {
            return value;
        } else {
            this.command.error(`Contracts file ${value} does not exist`);
        }
    }

    @Option({
        flags: '-n, --network <network>',
        description: 'the network where the contracts are deployed (default: amoy)',
        defaultValue: 'amoy'
    })
    parseAndValidateNetwork(value: string): string {
        const networkIsSupported = Object.values(SupportedVennNetworks).includes(value as SupportedVennNetworks);

        if (networkIsSupported) {
            return value;
        } else {
            this.command.error(`Network ${value} is not supported`);
        }
    }

    @Option({
        flags: '-p, --policy <policy>',
        description: 'the security policy that will be used for onchain protection (default: approved-calls)',
        defaultValue: 'approved-calls'
    })
    parseAndValidatePolicy(value: string): string {
        const policyIsSupported = Object.values(SupportedVennPolicies).includes(value as SupportedVennPolicies);

        if (policyIsSupported) {
            return value;
        } else {
            this.command.error(`Policy ${value} is not supported`);
        }
    }
}
