// 3rd party.
import { Injectable } from '@nestjs/common';
// Internal.
import { withHooks } from '../../lib/decorators';
import { assertDirExistsHook, assertFileExistsHook, npmInstallFirewallConsumerHook } from './utils';

@Injectable()
export class FirewallIntegrateService {
    constructor() {}

    @withHooks([assertFileExistsHook, npmInstallFirewallConsumerHook])
    public async integContractFile(filepath: string): Promise<void> {
        console.log('Integ file', filepath);
    }

    @withHooks([assertDirExistsHook, npmInstallFirewallConsumerHook])
    public async integContractsDir(dirpath: string, recursive: boolean): Promise<void> {
        console.log('Integ dir', dirpath, recursive);
    }
}
