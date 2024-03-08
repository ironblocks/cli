import {
    QUESTION_MESSAGE,
    QUESTION_NAME,
    QUESTION_SET_NAME,
    QUESTION_TYPE
} from '@/dependencies/dependencies.questions.descriptor';

describe('Dependencies Questions Descriptor', () => {
    it('has the correct question-set name', () => {
        expect(QUESTION_SET_NAME).toBe('dependencies');
    });

    it('has the correct question type', () => {
        expect(QUESTION_TYPE).toBe('confirm');
    });

    it('has the correct question name', () => {
        expect(QUESTION_NAME).toBe('installDependencies');
    });

    it('has the correct question message', () => {
        expect(QUESTION_MESSAGE).toBe('Do you want to install missing dependencies?');
    });
});
