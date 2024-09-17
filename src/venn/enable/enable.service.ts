import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/lib/logging/logger.service';

export type EnableProtectionOptions = {
    contractsFile: string;
    network: string;
    policy: string;
};

@Injectable()
export class EnableService {
    constructor(private readonly logger: LoggerService) {}

    async enable(options: EnableProtectionOptions): Promise<boolean> {
        this.logger.log(
            `Enabling protection for contracts in ${options.contractsFile} on network ${options.network} with policy ${options.policy}`
        );

        return true;
    }
}
