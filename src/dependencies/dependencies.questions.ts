import { Question, QuestionSet } from 'nest-commander';

import {
    QUESTION_MESSAGE,
    QUESTION_NAME,
    QUESTION_SET_NAME,
    QUESTION_TYPE
} from '@/dependencies/dependencies.questions.descriptor';

@QuestionSet({ name: QUESTION_SET_NAME })
export class DependenciesQuestions {
    @Question({
        type: QUESTION_TYPE,
        name: QUESTION_NAME,
        message: QUESTION_MESSAGE
    })
    parseInstallDependencies() {}
}
