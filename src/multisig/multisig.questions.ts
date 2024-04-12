import { Question, QuestionSet } from 'nest-commander';

import {
    MULTISIG_QUESTION_MESSAGE,
    MULTISIG_QUESTION_NAME,
    MULTISIG_QUESTION_SET_NAME,
    MULTISIG_QUESTION_TYPE
} from '@/multisig/multisig.questions.descriptor';
import { ethers } from 'ethers';

export type MultisigAnswers = {
    [MULTISIG_QUESTION_NAME]: string;
};

@QuestionSet({ name: MULTISIG_QUESTION_SET_NAME })
export class MultisigQuestions {
    @Question({
        type: MULTISIG_QUESTION_TYPE,
        name: MULTISIG_QUESTION_NAME,
        message: MULTISIG_QUESTION_MESSAGE
    })
    parseMultisigAddress(multisigAddress: string): string {
        return ethers.isAddress(multisigAddress) ? ethers.getAddress(multisigAddress) : '';
    }
}
