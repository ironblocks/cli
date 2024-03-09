import { Question, QuestionSet } from 'nest-commander';

import {
    QUESTION_MESSAGE,
    QUESTION_NAME,
    QUESTION_SET_NAME,
    QUESTION_TYPE
} from '@/framework/install-dependencies.questions.descriptor';

export type InstallDependenciesAnswers = {
    installDependencies: boolean;
};

@QuestionSet({ name: QUESTION_SET_NAME })
export class InstallDependenciesQuestions {
    @Question({
        type: QUESTION_TYPE,
        name: QUESTION_NAME,
        message: QUESTION_MESSAGE
    })
    parseInstallDependencies() {}
}
