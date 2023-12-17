// 3rd party.
import { Question, QuestionSet } from 'nest-commander';
// Internal.
import { PromptError } from '../../lib/errors/prompt.error';

@QuestionSet({ name: 'firewall-integrate-questions' })
export class FirewallIntegrateQuestions {
    @Question({
        message: 'Install required dependencies? [y/n]',
        name: 'installDependencies',
    })
    parseInstallDependencies(val: string): string {
        const answer = { y: 'yes', n: 'no' }[val];
        if (answer !== undefined) {
            return answer;
        }

        throw new PromptError("Please type 'y' to install, or 'n' to quit");
    }
}
