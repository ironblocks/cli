import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';

export const SELECT_STRATEGY_QUESTION_TYPE = 'list';
export const SELECT_STRATEGY_QUESTION_NAME = 'selectDependenciesStrategy';
export const SELECT_STRATEGY_QUESTION_SET_NAME = 'dependenciesStrategy';
export const SELECT_STRATEGY_QUESTION_MESSAGE = 'What dependencies manager tool are you using?';
export const SELECT_STRATEGY_QUESTION_CHOICES = [
    DependenciesStrategy.NPM,
    DependenciesStrategy.Yarn,
    DependenciesStrategy.Forge,
    DependenciesStrategy.Other
];
