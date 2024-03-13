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
export class YarnStrategy implements IStrategy {
    public dependencies: Dependency[] = NPM_DEPENDENCIES;

    constructor(private readonly logger: LoggerService) {}

    public async isDependencyInstalled(dependency: Dependency): Promise<boolean> {
        try {
            //
            // -i means case insensitive
            // -F means the string is a fixed string, not a regex
            await execAsync(`yarn why "${dependency.installName}" | grep -i -F "${dependency.installName}@"`, {
                encoding: 'utf-8'
            });
            return true;
        } catch (e) {
            // grep error codes
            // 1: No match was found
            // 2: A file error occurred
            switch (e.code) {
                case 1:
                    return false;
                default:
                    throw new DependenciesError(`Could not check if dependency "${dependency.name}" is installed`);
            }
        }
    }

    public async installDependency(dependency: Dependency): Promise<void> {
        const spinner = this.logger.spinner(`Installing "${colors.cyan(dependency.name)}"`);

        try {
            await execAsync(`yarn add "${dependency.installName}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed "${colors.cyan(dependency.name)}"`);
        } catch (e) {
            spinner.fail(`Failed to install "${colors.cyan(dependency.name)}"`);

            // TODO: Handle "unclean repo error" from "forge install"
            throw new DependenciesError(`Could not install dependency: ${dependency.name}.\n${e.message}`);
        }
    }
}
