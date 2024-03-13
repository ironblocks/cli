import * as colors from 'colors';
import { Injectable } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { FoundryService } from '@/framework/foundry.service';
import { HardhatService } from '@/framework/hardhat.service';
import { FrameworkTypes } from '@/framework/supported-frameworks.enum';
import { DependenciesService } from '@/framework/dependencies.services';

@Injectable()
export class FrameworkService {
    constructor(
        private readonly logger: LoggerService,
        private readonly foundryService: FoundryService,
        private readonly hardhatService: HardhatService,
        private readonly dependenciesService: DependenciesService
    ) {}

    public async assertDependencies(): Promise<void> {
        await this.assertFrameworkType();
        await this.dependenciesService.assertDependencies();
    }

    public async assertFrameworkType(): Promise<void> {
        const spinner = this.logger.spinner('Detecting development framework');
        const frameworkType = await this.getFrameworkType();

        if (frameworkType === FrameworkTypes.Unknown) {
            spinner.warn('Unknown development framework (expected Foundry or Hardhat)');
        } else {
            spinner.info(`Detected ${colors.bold(frameworkType)} development framework`);
        }
    }

    public async getFrameworkType(): Promise<FrameworkTypes> {
        if (await this.foundryService.isFoundryProject()) {
            return FrameworkTypes.Foundry;
        } else if (await this.hardhatService.isHardhatProject()) {
            return FrameworkTypes.Hardhat;
        } else {
            return FrameworkTypes.Unknown;
        }
    }
}
