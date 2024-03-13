import { TestBed } from '@automock/jest';

import { FilesService } from '@/files/files.service';
import { HardhatService } from '@/framework/hardhat.service';

describe('Hardhat Service', () => {
    let hardhatService: HardhatService;
    let filesServiceMock: jest.Mocked<FilesService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(HardhatService).compile();

        hardhatService = unit;
        filesServiceMock = unitRef.get(FilesService);
    });

    describe('.isHardhatProject()', () => {
        it('returns true if a hardhat config file exists', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(true);

            const result = await hardhatService.isHardhatProject();
            expect(result).toBe(true);
        });

        it('returns false if a hardhat config file does not exist', async () => {
            filesServiceMock.doesFileExist.mockResolvedValue(false);

            const result = await hardhatService.isHardhatProject();
            expect(result).toBe(false);
        });
    });
});
