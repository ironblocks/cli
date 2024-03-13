import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';

describe('Dependencies Strategy Enum', () => {
    const expectedEnumValues = {
        NPM: 'npm',
        Yarn: 'yarn',
        Forge: 'forge',
        Other: 'other'
    };

    it('has a type for Forge', () => {
        expect(DependenciesStrategy.Forge).toBe(expectedEnumValues.Forge);
    });

    it('has a type for NPM', () => {
        expect(DependenciesStrategy.NPM).toBe(expectedEnumValues.NPM);
    });

    it('has a type for Yarn', () => {
        expect(DependenciesStrategy.Yarn).toBe(expectedEnumValues.Yarn);
    });

    it('has a type for Other', () => {
        expect(DependenciesStrategy.Other).toBe(expectedEnumValues.Other);
    });
});
