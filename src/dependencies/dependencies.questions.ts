import { Question, QuestionSet } from 'nest-commander';

@QuestionSet({ name: 'dependencies' })
export class DependenciesQuestions {
    @Question({
        type: 'confirm',
        name: 'installDependencies',
        message: 'Do you want to install missing dependencies?'
    })
    parseInstallDependencies() {}
}
