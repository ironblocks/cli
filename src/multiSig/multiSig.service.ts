import { LoggerService } from '@/lib/logging/logger.service';
import { MultiSigAnswers } from '@/multiSig/multiSig.questions';
import { MULTISIG_QUESTION_SET_NAME } from '@/multiSig/multiSig.questions.descriptor';
import { Network } from '@/multiSig/networks.enum';
import { SafeService } from '@/multiSig/safe.service';
import { Injectable } from '@nestjs/common';
import * as colors from 'colors';
import { InquirerService } from 'nest-commander';
import { NetworkAnswers } from '@/multiSig/network.questions';
import { NETWORK_QUESTION_SET_NAME } from '@/multiSig/network.questions.descriptor';

@Injectable()
export class MultiSigService {
    constructor(
        private readonly logger: LoggerService,
        private readonly inquirer: InquirerService,
        private readonly safeService: SafeService
    ) {}

    async getMultiSigAddress(): Promise<string | undefined> {
        const chainId = await this.promptToChooseNetwork();

        if (chainId === Network.Skip) {
            this.logger.warn(`Skipping Multi-Sig integration`);
        } else {
            const multisigAddress = await this.promptForMultiSigAddress();
            this.logger.log(`Using Multi-Sig Address: ${colors.cyan(multisigAddress)}`);

            if (chainId !== Network.Other) {
                this.logger.log(`Validating Multi-Sig Address on ${colors.cyan(Network[chainId])} network`);

                await this.safeService.validateMultiSigAddress(chainId, multisigAddress);
            }

            return multisigAddress;
        }
    }

    private async promptToChooseNetwork(): Promise<number> {
        return (await this.inquirer.ask<NetworkAnswers>(NETWORK_QUESTION_SET_NAME, {})).chooseNetwork ?? Network.Skip;
    }

    private async promptForMultiSigAddress(): Promise<string> {
        return (await this.inquirer.ask<MultiSigAnswers>(MULTISIG_QUESTION_SET_NAME, {})).provideMultiSigAddress;
    }
}
