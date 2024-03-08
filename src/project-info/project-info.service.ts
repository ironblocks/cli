import * as fs from 'fs/promises';

import { Injectable } from '@nestjs/common';

enum ProjectTypes {
    Foundry = 'foundry',
    Hardhat = 'hardhat'
}

type ProjectInfo = {
    type: ProjectTypes;
};

@Injectable()
export class ProjectInfoService {
    async getProjectInfo(): Promise<ProjectInfo> {
        const type = (await this.isFoundryProject()) ? ProjectTypes.Foundry : ProjectTypes.Hardhat;

        return { type };
    }

    async isFoundryProject(): Promise<boolean> {
        try {
            await fs.access('foundry.toml', fs.constants.F_OK);
            return true;
        } catch (e) {
            return false;
        }
    }
}
