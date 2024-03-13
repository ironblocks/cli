import { TestBed } from '@automock/jest';

import { FilesService } from '@/files/files.service';
import { FoundryService } from '@/framework/foundry.service';

describe('Foundry Service', () => {
    let foundryService: FoundryService;
    let filesServiceMock: jest.Mocked<FilesService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(FoundryService).compile();

        foundryService = unit;
        filesServiceMock = unitRef.get(FilesService);
    });

    describe('.isFoundryProject()', () => {
        it('returns true if a foundry.toml file exists', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            const result = await foundryService.isFoundryProject();
            expect(result).toBe(true);
        });

        it('returns false if a foundry.toml file does not exist', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(false);

            const result = await foundryService.isFoundryProject();
            expect(result).toBe(false);
        });
    });
});
