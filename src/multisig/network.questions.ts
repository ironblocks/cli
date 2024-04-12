import { Question, QuestionSet } from 'nest-commander';

import {
    NETWORK_QUESTION_MESSAGE,
    NETWORK_QUESTION_NAME,
    NETWORK_QUESTION_SET_NAME,
    NETWORK_QUESTION_TYPE
} from '@/multisig/network.questions.descriptor';
import { Network } from './multisig.safe.constants';

export type NetworkAnswers = {
    [NETWORK_QUESTION_NAME]: number;
};

@QuestionSet({ name: NETWORK_QUESTION_SET_NAME })
export class NetworkQuestions {
    @Question({
        type: NETWORK_QUESTION_TYPE,
        name: NETWORK_QUESTION_NAME,
        message: NETWORK_QUESTION_MESSAGE,
        choices: Object.keys(Network).filter(key => isNaN(Number(key)))
    })
    parseNetwork(networkName: string): number {
        return Network[networkName];
    }
}
