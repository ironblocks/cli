import { Question, QuestionSet } from 'nest-commander';

import {
    NETWORK_QUESTION_MESSAGE,
    NETWORK_QUESTION_NAME,
    NETWORK_QUESTION_SET_NAME,
    NETWORK_QUESTION_TYPE,
    NETWORK_QUESTION_CHOICES
} from '@/multiSig/network.questions.descriptor';
import { Network } from '@/multiSig/networks.enum';

export type NetworkAnswers = {
    [NETWORK_QUESTION_NAME]: number;
};

@QuestionSet({ name: NETWORK_QUESTION_SET_NAME })
export class NetworkQuestions {
    @Question({
        type: NETWORK_QUESTION_TYPE,
        name: NETWORK_QUESTION_NAME,
        message: NETWORK_QUESTION_MESSAGE,
        choices: NETWORK_QUESTION_CHOICES
    })
    parseNetwork(networkName: string): number {
        return Network[networkName];
    }
}
