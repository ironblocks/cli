// Builtin.
import { exec, spawn } from 'child_process';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function assertFileExistsHook(path: string): Promise<void> {
    try {
        await stat(path);
    } catch (err) {
        throw new Error(`file does not exist '${resolve(path)}'`);
    }
}

export async function assertDirExistsHook(path: string): Promise<void> {
    try {
        const stats = await stat(path);
        if (!stats.isDirectory()) {
            throw new Error();
        }
    } catch (err) {
        throw new Error(`directory does not exist '${resolve(path)}'`);
    }
}

export async function npmInstallFirewallConsumerHook(path: string): Promise<void> {
    await installNodeModuleIfNeeded('@ironblocks/firewall-consumer', path);
}

async function installNodeModuleIfNeeded(dependency: string, path: string): Promise<void> {
    if (await isNodeModuleInstalled(dependency, path)) {
        return;
    }

    await installNodeModule(dependency, path);
}

async function isNodeModuleInstalled(dependency: string, path: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync('npm list', { cwd: path });
        if (stdout && stdout.includes(dependency)) {
            return true;
        }
    } catch (err) {}
    return false;
}

function installNodeModule(dependency: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Installing dependency '${dependency}'\r\n`);
        const spawned = spawn('npm', ['install', dependency], {
            cwd: path,
            stdio: 'inherit',
            shell: true,
            detached: true,
        });
        spawned.on('exit', (exitcode: number) => {
            if (exitcode === 0) {
                resolve();
            } else {
                reject(new Error(`cannot install dependency '${dependency}'`));
            }
            console.log('\r\n');
        });
    });
}
