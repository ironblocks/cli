import { FilesService } from '@/files/files.service';

//
// Due to how ES6 modules work, we need to mock the fs/promises module using jest.mock
// before any of our tests run. This is because the module is imported at the top of the
// file, and the mock needs to be in place before the module is imported.
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
        });

        it('returns false if the file does not exist', async () => {
            const filepath = 'non-existent.txt';
            fs.access.mockRejectedValueOnce(new Error('File not found'));

            const result = await service.doesFileExist(filepath);
            expect(result).toBe(false);
        });
    });

    describe('.doesFileNotExist()', () => {
        it('returns false if the file exists', async () => {
            const filepath = __filename;

            const result = await service.doesFileNotExist(filepath);
            expect(result).toBe(false);
        });

        it('returns true if the file does not exist', async () => {
            const filepath = 'non-existent.txt';
            fs.access.mockRejectedValueOnce(new Error('File not found'));

            const result = await service.doesFileNotExist(filepath);
            expect(result).toBe(true);
        });
    });
});
