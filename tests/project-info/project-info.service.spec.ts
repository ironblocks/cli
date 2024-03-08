import { TestBed } from '@automock/jest';

import { ProjectInfoService, ProjectTypes } from '@/project-info/project-info.service';
import { FilesService } from '@/files/files.service';

describe('Project Info Service', () => {
    let projectInfoService: ProjectInfoService;
    let filesService: jest.Mocked<FilesService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(ProjectInfoService).compile();

        projectInfoService = unit;
        filesService = unitRef.get(FilesService);
    });

    describe('.getProjectInfo()', () => {
        it('deafults the project type to Hardhat projects', async () => {
            projectInfoService.isFoundryProject = jest.fn().mockResolvedValue(false);

            const { type } = await projectInfoService.getProjectInfo();
            expect(type).toBe(ProjectTypes.Hardhat);
        });

        it('sets the correct type for Foundry projects', async () => {
            projectInfoService.isFoundryProject = jest.fn().mockResolvedValue(true);

            const { type } = await projectInfoService.getProjectInfo();
            expect(type).toBe(ProjectTypes.Foundry);
        });
    });

    describe('.isFoundryProject()', () => {
        it('returns true if "foundry.toml" exists', async () => {
            filesService.doesFileExist.mockResolvedValue(true);

            const result = await projectInfoService.isFoundryProject();
            expect(result).toBe(true);
        });

        it('returns false if "foundry.toml" does not exist', async () => {
            filesService.doesFileExist.mockResolvedValue(false);

            const result = await projectInfoService.isFoundryProject();
            expect(result).toBe(false);
        });
    });
});
