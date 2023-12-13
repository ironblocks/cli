// 3rd party.
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';
// Builtin.
import { exec, spawn } from 'child_process';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class FirewallIntegrateUtils {
    constructor(private readonly inquirer: InquirerService) {}

    async assertFileExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isFile()) {
                throw new Error();
            }
        } catch (err) {
            throw new Error(`file does not exist '${resolve(path)}'`);
        }
    }

    async assertDirExists(path: string): Promise<void> {
        try {
            const stats = await stat(path);
            if (!stats.isDirectory()) {
                throw new Error();
            }
        } catch (err) {
            throw new Error(`directory does not exist '${resolve(path)}'`);
        }
    }

    async npmInstallFirewallConsumer(dirpath: string): Promise<void> {
        await this.installNodeModuleIfNeeded('@ironblocks/firewall-consumer', dirpath);
    }

    private async installNodeModuleIfNeeded(dependency: string, dirpath: string): Promise<void> {
        if (await this.isNodeModuleInstalled(dependency, dirpath)) {
            return;
        }

        await this.installNodeModule(dependency, dirpath);
    }

    private async isNodeModuleInstalled(dependency: string, dirpath: string): Promise<boolean> {
        try {
            const { stdout } = await execAsync('npm list', { cwd: dirpath });
            if (stdout && stdout.includes(dependency)) {
                return true;
            }
        } catch (err) {}
        return false;
    }

    private async installNodeModule(dependency: string, dirpath: string): Promise<void> {
        const answer = await this.inquirer.ask<{ installDependencies: boolean }>(
            'firewall-integrate-questions',
            undefined,
        );
        const { installDependencies } = answer;
        if (!installDependencies) {
            throw new Error(`missing required dependency '${dependency}'`);
        }

        return new Promise((resolve, reject) => {
            const spawned = spawn('npm', ['install', '--silent', dependency], {
                cwd: dirpath,
                stdio: 'inherit',
                detached: false,
            });
            spawned.on('exit', (exitcode: number) => {
                if (exitcode === 0) {
                    resolve();
                } else {
                    reject(new Error(`cannot install dependency '${dependency}'`));
                }
            });
        });
    }
}
