import * as colors from 'colors';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Injectable } from '@nestjs/common';

import { IStrategy } from '@/framework/strategy.interface';
import { Dependency } from '@/framework/dependency.type';
import { LoggerService } from '@/lib/logging/logger.service';
import { NPM_DEPENDENCIES } from '@/framework/npm-dependencies.constatns';
import { DependenciesError } from '@/framework/dependencies.errors';

const execAsync = promisify(exec);

@Injectable()
export class NPMStrategy implements IStrategy {
    public dependencies: Dependency[] = NPM_DEPENDENCIES;

    constructor(private readonly logger: LoggerService) {}

    public async isDependencyInstalled(dependency: Dependency): Promise<boolean> {
        try {
            await execAsync(`npm ls "${dependency.installName}"`, { encoding: 'utf-8' });
            return true;
        } catch (e) {
            const dependencyNotInstalled = e.code === 1 && e?.stdout?.includes('(empty)');

            if (dependencyNotInstalled) {
                return false;
            } else {
                throw new DependenciesError(`Could not check if dependency "${dependency.name}" is installed`);
            }
        }
    }

    public async installDependency(dependency: Dependency): Promise<void> {
        const spinner = this.logger.spinner(`Installing "${colors.cyan(dependency.name)}"`);

        try {
            await execAsync(`npm install "${dependency.installName}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed "${colors.cyan(dependency.name)}"`);
        } catch (e) {
            spinner.fail(`Failed to install "${colors.cyan(dependency.name)}"`);

            // TODO: Handle "unclean repo error" from "forge install"
            throw new DependenciesError(`Could not install dependency: ${dependency.name}.\n${e.message}`);
        }
    }
}
