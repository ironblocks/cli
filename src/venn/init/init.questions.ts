import { Question, QuestionSet } from 'nest-commander';
import {
    NETWORK_QUESTION_SET_NAME,
    NETWORK_QUESTION_NAME,
    NETWORK_QUESTION_TYPE,
    NETWORK_QUESTION_MESSAGE,
    CONTRACT_SELECTION_QUESTION_SET_NAME,
    CONTRACT_SELECTION_QUESTION_NAME,
    CONTRACT_SELECTION_QUESTION_TYPE,
    CONTRACT_SELECTION_QUESTION_MESSAGE,
    PRIVATE_KEY_QUESTION_SET_NAME,
    PRIVATE_KEY_QUESTION_NAME,
    PRIVATE_KEY_QUESTION_TYPE,
    PRIVATE_KEY_QUESTION_MESSAGE,
    PRIVATE_KEY_QUESTION_CHOICES
} from './init.questions.descriptor';

export type NetworkQuestionAnswers = {
    [NETWORK_QUESTION_NAME]: string;
};

export type ContractSelectionAnswers = {
    [CONTRACT_SELECTION_QUESTION_NAME]: string[];
};

export type PrivateKeyQuestionAnswers = {
    [PRIVATE_KEY_QUESTION_NAME]: string;
};

export interface ContractChoice {
    name: string;
    value: string;
    checked?: boolean;
}

@QuestionSet({ name: NETWORK_QUESTION_SET_NAME })
export class NetworkQuestions {
    @Question({
        type: NETWORK_QUESTION_TYPE,
        name: NETWORK_QUESTION_NAME,
        message: NETWORK_QUESTION_MESSAGE,
        choices: ['Ethereum Mainnet', 'Holesky Testnet', 'Sepolia Testnet', 'Arbitrum One']
    })
    parseNetwork(answer: string): string {
        // Convert display names to network keys
        const networkMap: Record<string, string> = {
            'Ethereum Mainnet': 'mainnet',
            'Holesky Testnet': 'holesky',
            'Sepolia Testnet': 'sepolia',
            'Arbitrum One': 'arbitrum'
        };
        return networkMap[answer] || 'holesky';
    }
}

@QuestionSet({ name: CONTRACT_SELECTION_QUESTION_SET_NAME })
export class ContractSelectionQuestions {
    @Question({
        type: CONTRACT_SELECTION_QUESTION_TYPE,
        name: CONTRACT_SELECTION_QUESTION_NAME,
        message: CONTRACT_SELECTION_QUESTION_MESSAGE,
        choices: [] // Will be set dynamically
    })
    parseContractSelection(answers: string[]): string[] {
        return answers;
    }
}

@QuestionSet({ name: PRIVATE_KEY_QUESTION_SET_NAME })
export class PrivateKeyQuestions {
    @Question({
        type: PRIVATE_KEY_QUESTION_TYPE,
        name: PRIVATE_KEY_QUESTION_NAME,
        message: PRIVATE_KEY_QUESTION_MESSAGE,
        choices: PRIVATE_KEY_QUESTION_CHOICES
    })
    parsePrivateKeyStorage(answer: string): string {
        return answer;
    }
}
