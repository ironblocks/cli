import { Question, QuestionSet } from 'nest-commander';

import {
    INSTALL_DEPENDENCIES_QUESTION_MESSAGE,
    INSTALL_DEPENDENCIES_QUESTION_NAME,
    INSTALL_DEPENDENCIES_QUESTION_SET_NAME,
    INSTALL_DEPENDENCIES_QUESTION_TYPE
} from '@/framework/install-dependencies.questions.descriptor';

export type InstallDependenciesAnswers = {
    [INSTALL_DEPENDENCIES_QUESTION_NAME]: boolean;
};

@QuestionSet({ name: INSTALL_DEPENDENCIES_QUESTION_SET_NAME })
export class InstallDependenciesQuestions {
    @Question({
        type: INSTALL_DEPENDENCIES_QUESTION_TYPE,
        name: INSTALL_DEPENDENCIES_QUESTION_NAME,
        message: INSTALL_DEPENDENCIES_QUESTION_MESSAGE
    })
    parseInstallDependencies() {}
}
