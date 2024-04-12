import { LoggerService } from '@/lib/logging/logger.service';
import { Injectable } from '@nestjs/common';
import * as colors from 'colors';
import { InquirerService } from 'nest-commander';
import { MultisigAnswers } from './multisig.questions';
import { MULTISIG_QUESTION_SET_NAME } from './multisig.questions.descriptor';
import { Network } from './multisig.safe.constants';
import { NetworkService } from './network.service';
import { SafeService } from './safe.service';

@Injectable()
export class MultisigService {
    constructor(
        private readonly logger: LoggerService,
        private readonly inquirer: InquirerService,
        private readonly networkService: NetworkService,
        private readonly safeService: SafeService
    ) {}

    async runMultisigFlow(): Promise<string> {
        const chainId = await this.networkService.askToChooseNetwork();

        let multisigAddress = '';

        if (chainId != Network.Skip) {
            multisigAddress = await this.askForMultisigAddress();

            if (multisigAddress) {
                if (chainId != Network.Other) {
                    await this.safeService.validateMultisigAddress(chainId, multisigAddress);
                } else {
                    this.logger.warn(
                        `Network is set to "Other". Skipping multisig address validation using ${colors.cyan(
                            'SAFE'
                        )} service`
                    );
                }
            }
        }

        multisigAddress
            ? this.logger.log(`Multisig address provided: ${colors.cyan(multisigAddress)}`)
            : this.logger.warn('Multisig address is not provided or invalid. Skipping multisig support.');

        return multisigAddress;
    }

    private async askForMultisigAddress(): Promise<string> {
        return (await this.inquirer.ask<MultisigAnswers>(MULTISIG_QUESTION_SET_NAME, {})).provideMultisigAddress;
    }
}
