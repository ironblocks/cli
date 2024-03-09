import * as colors from 'colors';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { FoundryService } from '@/framework/foundry.service';
import { HardhatService } from '@/framework/hardhat.service';
import { FrameworkError } from '@/framework/framework.errors';
import { SupportedFrameworks } from '@/framework/supported-frameworks.enum';

@Injectable()
export class FrameworkService {
    constructor(
        private readonly foundryService: FoundryService,
        private readonly hardhatService: HardhatService,
        private readonly logger: LoggerService
    ) {}

    public async assertDependencies(): Promise<void> {
        const frameworkType = (await this.getFrameworkType()) || 'Unknown Framework';
        this.logger.log(`Development Framework: ${colors.cyan(frameworkType)}`);

        switch (frameworkType) {
            case SupportedFrameworks.Foundry:
                await this.foundryService.assertDependencies();
                break;
            case SupportedFrameworks.Hardhat:
                await this.hardhatService.assertDependencies();
                break;
            default:
                throw new FrameworkError(
                    `Unknown development framework (are you missing a ${colors.cyan(
                        'hardhat.config.js/ts'
                    )} or ${colors.cyan('foundry.toml')} file?)`
                );
        }
    }

    private async getFrameworkType(): Promise<SupportedFrameworks> {
        if (await this.foundryService.isFoundryProject()) {
            return SupportedFrameworks.Foundry;
        } else if (await this.hardhatService.isHardhatProject()) {
            return SupportedFrameworks.Hardhat;
        }
    }
}
