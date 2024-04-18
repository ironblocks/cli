import { Question, QuestionSet } from 'nest-commander';

import {
    MULTISIG_QUESTION_MESSAGE,
    MULTISIG_QUESTION_NAME,
    MULTISIG_QUESTION_SET_NAME,
    MULTISIG_QUESTION_TYPE,
    MULTISIG_INVALID_ADDRESS_MESSAGE
} from '@/multiSig/multiSig.questions.descriptor';
import { ethers } from 'ethers';

export type MultiSigAnswers = {
    [MULTISIG_QUESTION_NAME]: string;
};

@QuestionSet({ name: MULTISIG_QUESTION_SET_NAME })
export class MultiSigQuestions {
    @Question({
        type: MULTISIG_QUESTION_TYPE,
        name: MULTISIG_QUESTION_NAME,
        message: MULTISIG_QUESTION_MESSAGE,
        validate: multiSigAddress => {
            ethers.Wallet.createRandom();
            return ethers.isAddress(multiSigAddress) || MULTISIG_INVALID_ADDRESS_MESSAGE;
        }
    })
    parseMultiSigAddress(multiSigAddress: string): string {
        return multiSigAddress;
    }
}
