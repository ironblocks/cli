import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';

import {
    SELECT_STRATEGY_QUESTION_CHOICES,
    SELECT_STRATEGY_QUESTION_MESSAGE,
    SELECT_STRATEGY_QUESTION_NAME,
    SELECT_STRATEGY_QUESTION_SET_NAME,
    SELECT_STRATEGY_QUESTION_TYPE
} from '@/framework/select-dependencies-strategy.questions.descriptor';

describe('Install Dependencies Questions Descriptor', () => {
    it('defines the correct question type', () => {
        expect(SELECT_STRATEGY_QUESTION_TYPE).toBe('list');
    });

    it('defines the correct question name', () => {
        expect(SELECT_STRATEGY_QUESTION_NAME).toBe('selectDependenciesStrategy');
    });

    it('defines the correct question set name', () => {
        expect(SELECT_STRATEGY_QUESTION_SET_NAME).toBe('dependenciesStrategy');
    });

    it('defines the correct question message', () => {
        expect(SELECT_STRATEGY_QUESTION_MESSAGE).toBe('What dependencies manager tool are you using?');
    });

    it('defines the correct choices', () => {
        expect(SELECT_STRATEGY_QUESTION_CHOICES).toContain(DependenciesStrategy.NPM);
        expect(SELECT_STRATEGY_QUESTION_CHOICES).toContain(DependenciesStrategy.Yarn);
        expect(SELECT_STRATEGY_QUESTION_CHOICES).toContain(DependenciesStrategy.Forge);
        expect(SELECT_STRATEGY_QUESTION_CHOICES).toContain(DependenciesStrategy.Other);
    });
});
