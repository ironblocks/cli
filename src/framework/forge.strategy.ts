import * as colors from 'colors';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Injectable } from '@nestjs/common';

import { IStrategy } from '@/framework/strategy.interface';
import { Dependency } from '@/framework/dependency.type';
import { FilesService } from '@/files/files.service';
import { LoggerService } from '@/lib/logging/logger.service';
import { DependenciesError } from '@/framework/dependencies.errors';
import { FORGE_DEPENDENCIES } from '@/framework/forge-dependencies.constants';

const execAsync = promisify(exec);

@Injectable()
export class ForgeStrategy implements IStrategy {
    public dependencies: Dependency[] = FORGE_DEPENDENCIES;

    constructor(
        private readonly logger: LoggerService,
        private readonly filesService: FilesService
    ) {}

    public async isDependencyInstalled(dependency: Dependency): Promise<boolean> {
        const missingGitModulesFile = await this.filesService.doesFileNotExist('.gitmodules');
        if (missingGitModulesFile) {
            return false;
        } else {
            try {
                //
                // -i means case insensitive
                // -F means the string is a fixed string, not a regex
                await execAsync(`grep -i -F -- "${dependency.name}" .gitmodules`, { encoding: 'utf-8' });
                return true;
            } catch (e) {
                // grep error codes
                // 1: No match was found
                // 2: A file error occurred
                switch (e.code) {
                    case 1:
                        return false;
                    default:
                        throw new DependenciesError(
                            `Could not search for dependency "${dependency.name}" in .gitmodules file`
                        );
                }
            }
        }
    }

    public async installDependency(dependency: Dependency): Promise<void> {
        const spinner = this.logger.spinner(`Installing "${colors.cyan(dependency.name)}"`);

        try {
            await execAsync(`forge install "${dependency.installName}"`, { encoding: 'utf-8' });
            spinner.succeed(`Installed "${colors.cyan(dependency.name)}"`);
        } catch (e) {
            spinner.fail(`Failed to install "${colors.cyan(dependency.name)}"`);

            // TODO: Handle "unclean repo error" from "forge install"
            throw new DependenciesError(`Could not install dependency: ${dependency.name}.\n${e.message}`);
        }
    }
}
