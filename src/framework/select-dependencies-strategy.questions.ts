import { Question, QuestionSet } from 'nest-commander';

import { DependenciesStrategy } from '@/framework/dependencies-strategies.enum';
import {
    SELECT_STRATEGY_QUESTION_CHOICES,
    SELECT_STRATEGY_QUESTION_MESSAGE,
    SELECT_STRATEGY_QUESTION_NAME,
    SELECT_STRATEGY_QUESTION_SET_NAME,
    SELECT_STRATEGY_QUESTION_TYPE
} from '@/framework/select-dependencies-strategy.questions.descriptor';

export type SelectDependenciesStrategyAnswers = {
    [SELECT_STRATEGY_QUESTION_NAME]: DependenciesStrategy;
};

@QuestionSet({ name: SELECT_STRATEGY_QUESTION_SET_NAME })
export class SelectDependenciesStrategyQuestions {
    @Question({
        type: SELECT_STRATEGY_QUESTION_TYPE,
        name: SELECT_STRATEGY_QUESTION_NAME,
        message: SELECT_STRATEGY_QUESTION_MESSAGE,
        choices: SELECT_STRATEGY_QUESTION_CHOICES
    })
    parseInstallDependencies(answer: DependenciesStrategy): DependenciesStrategy {
        return answer;
    }
}
