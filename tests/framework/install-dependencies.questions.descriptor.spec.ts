import {
    QUESTION_MESSAGE,
    QUESTION_NAME,
    QUESTION_SET_NAME,
    QUESTION_TYPE
} from '@/framework/install-dependencies.questions.descriptor';

describe('Install Dependencies Questions Descriptor', () => {
    it('defines the correct question type', () => {
        expect(QUESTION_TYPE).toBe('confirm');
    });

    it('defines the correct question name', () => {
        expect(QUESTION_NAME).toBe('installDependencies');
    });

    it('defines the correct question set name', () => {
        expect(QUESTION_SET_NAME).toBe('dependencies');
    });

    it('defines the correct question message', () => {
        expect(QUESTION_MESSAGE).toBe('Do you want to install missing dependencies?');
    });
});
