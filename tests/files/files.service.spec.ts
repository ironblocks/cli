import { FilesService } from '@/files/files.service';

jest.mock('fs/promises', () => ({
    access: jest.fn(),
    constants: {
        F_OK: 0
    }
}));

describe('Files Service', () => {
    let service: FilesService;
    let fs: jest.Mocked<typeof import('fs/promises')>;

    beforeEach(() => {
        service = new FilesService();
        fs = require('fs/promises'); // Re-import fs to get the mocked version
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('.doesFileExist()', () => {
        it('returns true if the file exists', async () => {
            const filepath = __filename;

            const result = await service.doesFileExist(filepath);

            expect(result).toBe(true);
            expect(fs.access).toHaveBeenCalledWith(filepath, fs.constants.F_OK);
        });

        it('returns false if the file does not exist', async () => {
            const filepath = 'non-existent.txt';
            fs.access.mockRejectedValueOnce(new Error('File not found'));

            const result = await service.doesFileExist(filepath);

            expect(result).toBe(false);
        });
    });
});
