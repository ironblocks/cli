import { LoggerService } from '@/lib/logging/logger.service';
import { Injectable } from '@nestjs/common';
import SafeApiKit from '@safe-global/api-kit';
import * as colors from 'colors';
import { Network } from './multisig.safe.constants';

@Injectable()
export class SafeService {
    constructor(private readonly logger: LoggerService) {}

    // function to validate multisig address
    // if the address is valid the same address is returned
    // if the address is invalid, the address is reset to empty string
    async validateMultisigAddress(chainId: number, multisigAddress: string): Promise<void> {
        const spinner = this.logger.spinner(`Address validation using ${colors.cyan('SAFE')} service`);

        const safeService = new SafeApiKit({
            chainId: BigInt(chainId)
        });

        try {
            // if error is not thorwn, then the address is valid multisig address
            await safeService.getSafeInfo(multisigAddress);

            spinner.succeed(`Address is validated by SAFE service.`);
        } catch (error) {
            spinner.warn(
                `Provided multisig address is invalid: ${colors.cyan(multisigAddress)} for the ${colors.cyan(
                    Network[chainId]
                )} chain.`
            );

            // reset the address
            multisigAddress = '';
        }
    }
}
