import { LoggerService } from '@/lib/logging/logger.service';
import { Network, SupportedNetworks } from '@/multiSig/networks.enum';
import { Injectable } from '@nestjs/common';
import SafeApiKit from '@safe-global/api-kit';
import * as colors from 'colors';
import { InvalidMultiSigAddressError } from '@/multiSig/errors/invalid.multiSig.address.error';

@Injectable()
export class SafeService {
    constructor(private readonly logger: LoggerService) {}

    // function to validate multisig address
    // if the address is valid the same address is returned
    // if the address is invalid, the exception is thrown and cli execution is halted
    async validateMultiSigAddress(chainId: SupportedNetworks, multiSigAddress: string): Promise<void> {
        const spinner = this.logger.spinner(`Address validation using ${colors.cyan('SAFE')} service`);

        const safeService = new SafeApiKit({
            chainId: BigInt(chainId as number)
        });

        try {
            // if error is not thorwn, then the address is valid multisig address
            await safeService.getSafeInfo(multiSigAddress);

            spinner.succeed(`Address is validated by SAFE service.`);
        } catch (error) {
            spinner.fail(
                `Provided multisig address is invalid: ${colors.cyan(multiSigAddress)} for the ${colors.cyan(
                    Network[chainId as number]
                )} chain.`
            );

            throw new InvalidMultiSigAddressError('MultiSig address validation is failed.');
        }
    }
}
