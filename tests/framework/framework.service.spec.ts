import * as colors from 'colors';
import { Ora } from 'ora';
import { TestBed } from '@automock/jest';

import { LoggerService } from '@/lib/logging/logger.service';
import { FoundryService } from '@/framework/foundry.service';
import { HardhatService } from '@/framework/hardhat.service';
import { FrameworkTypes } from '@/framework/supported-frameworks.enum';
import { FrameworkService } from '@/framework/framework.service';
import { DependenciesService } from '@/framework/dependencies.services';

describe('Framework Service', () => {
    let frameworkService: FrameworkService;

    let loggerMock: jest.Mocked<LoggerService>;
    let foundryServiceMock: jest.Mocked<FoundryService>;
    let hardhatServiceMock: jest.Mocked<HardhatService>;
    let dependenciesServiceMock: jest.Mocked<DependenciesService>;

    let mockSpinner: Partial<Ora>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(FrameworkService).compile();

        frameworkService = unit;

        loggerMock = unitRef.get(LoggerService);
        foundryServiceMock = unitRef.get(FoundryService);
        hardhatServiceMock = unitRef.get(HardhatService);
        dependenciesServiceMock = unitRef.get(DependenciesService);

        mockSpinner = {
            warn: jest.fn(),
            info: jest.fn(),
            succeed: jest.fn()
        };

        loggerMock.spinner = jest.fn().mockReturnValue(mockSpinner);
    });

    describe('.assertDependencies()', () => {
        it('asserts the framework type', async () => {
            frameworkService.assertFrameworkType = jest.fn();

            await frameworkService.assertDependencies();

            expect(frameworkService.assertFrameworkType).toHaveBeenCalled();
        });

        it('asserts dependencies', async () => {
            await frameworkService.assertDependencies();

            expect(dependenciesServiceMock.assertDependencies).toHaveBeenCalled();
        });
    });

    describe('.assertFrameworkType()', () => {
        it('logs the framework type', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue('some framework');

            await frameworkService.assertDependencies();

            expect(mockSpinner.info).toHaveBeenCalledWith(
                `Detected ${colors.cyan('some framework')} development framework`
            );
        });

        it('logs a warning for unknown framework types', async () => {
            frameworkService.getFrameworkType = jest.fn().mockResolvedValue(FrameworkTypes.Unknown);

            await frameworkService.assertDependencies();

            expect(mockSpinner.warn).toHaveBeenCalledWith(
                'Unknown development framework (expected Foundry or Hardhat)'
            );
        });
    });

    describe('.getFrameworkType()', () => {
        it('returns Foundry for Foundry projects', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(true);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBe(FrameworkTypes.Foundry);
        });

        it('returns Hardhat for Hardhat projects', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(false);
            hardhatServiceMock.isHardhatProject = jest.fn().mockResolvedValue(true);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBe(FrameworkTypes.Hardhat);
        });

        it('returns "Unknown" for unknown types', async () => {
            foundryServiceMock.isFoundryProject = jest.fn().mockResolvedValue(false);
            hardhatServiceMock.isHardhatProject = jest.fn().mockResolvedValue(false);

            const result = await frameworkService.getFrameworkType();

            expect(result).toBe(FrameworkTypes.Unknown);
        });
    });
});
