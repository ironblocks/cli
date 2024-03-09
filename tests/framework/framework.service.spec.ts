import * as colors from 'colors';
import { TestBed } from '@automock/jest';

import { LoggerService } from '@/lib/logging/logger.service';
import { FoundryService } from '@/framework/foundry.service';
import { HardhatService } from '@/framework/hardhat.service';
import { FrameworkService } from '@/framework/framework.service';

describe('Framework Service', () => {
    let frameworkService: FrameworkService;

    let foundryServiceMock: jest.Mocked<FoundryService>;
    let hardhatServiceMock: jest.Mocked<HardhatService>;
    let loggerServiceMock: jest.Mocked<LoggerService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(FrameworkService).compile();

        frameworkService = unit;

        foundryServiceMock = unitRef.get(FoundryService);
        hardhatServiceMock = unitRef.get(HardhatService);
        loggerServiceMock = unitRef.get(LoggerService);
    });

    describe('.assertDependencies()', () => {
        it('logs the framework type', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue('some framework');

            try {
                await frameworkService.assertDependencies();
            } catch (e) {}

            expect(loggerServiceMock.log).toHaveBeenCalledWith(
                `Development Framework: ${colors.cyan('some framework')}`
            );
        });

        it('defaults the framework type to unknown', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue(undefined);

            try {
                await frameworkService.assertDependencies();
            } catch (e) {}

            expect(loggerServiceMock.log).toHaveBeenCalledWith(
                `Development Framework: ${colors.cyan('Unknown Framework')}`
            );
        });

        it('asserts dependencies for Foundry projects', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue('foundry');

            await frameworkService.assertDependencies();

            expect(foundryServiceMock.assertDependencies).toHaveBeenCalled();
        });

        it('asserts dependencies for Hardhat projects', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue('hardhat');

            await frameworkService.assertDependencies();

            expect(hardhatServiceMock.assertDependencies).toHaveBeenCalled();
        });

        it('throws a FrameworkError for unknown frameworks', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue('unknown');

            await expect(frameworkService.assertDependencies()).rejects.toThrow('Unknown development framework');
        });
    });

    describe('.getFrameworkType()', () => {
        it('returns Foundry for Foundry projects', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(true);
            hardhatServiceMock.isHardhatProject = jest.fn().mockResolvedValue(false);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBe('foundry');
        });

        it('returns Hardhat for Hardhat projects', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(false);
            hardhatServiceMock.isHardhatProject = jest.fn().mockResolvedValue(true);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBe('hardhat');
        });

        it('returns undefined for unknown projects', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(false);
            hardhatServiceMock.isHardhatProject = jest.fn().mockResolvedValue(false);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBeUndefined();
        });
    });
});
