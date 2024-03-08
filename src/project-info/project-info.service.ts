import { Injectable } from '@nestjs/common';
import { FilesService } from '@/files/files.service';

enum ProjectTypes {
    Foundry = 'foundry',
    Hardhat = 'hardhat'
}

type ProjectInfo = {
    type: ProjectTypes;
};

@Injectable()
export class ProjectInfoService {
    constructor(private filesService: FilesService) {}

    async getProjectInfo(): Promise<ProjectInfo> {
        const type = (await this.isFoundryProject()) ? ProjectTypes.Foundry : ProjectTypes.Hardhat;

        return { type };
    }

    async isFoundryProject(): Promise<boolean> {
        return this.filesService.doesFileExist('foundry.toml');
    }
}
