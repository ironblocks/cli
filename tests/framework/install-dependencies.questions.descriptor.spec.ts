import {
    INSTALL_DEPENDENCIES_QUESTION_MESSAGE,
    INSTALL_DEPENDENCIES_QUESTION_NAME,
    INSTALL_DEPENDENCIES_QUESTION_SET_NAME,
    INSTALL_DEPENDENCIES_QUESTION_TYPE
} from '@/framework/install-dependencies.questions.descriptor';

describe('Install Dependencies Questions Descriptor', () => {
    it('defines the correct question type', () => {
        expect(INSTALL_DEPENDENCIES_QUESTION_TYPE).toBe('confirm');
    });

    it('defines the correct question name', () => {
        expect(INSTALL_DEPENDENCIES_QUESTION_NAME).toBe('installDependencies');
    });

    it('defines the correct question set name', () => {
        expect(INSTALL_DEPENDENCIES_QUESTION_SET_NAME).toBe('dependencies');
    });

    it('defines the correct question message', () => {
        expect(INSTALL_DEPENDENCIES_QUESTION_MESSAGE).toBe('Do you want to install missing dependencies?');
    });
});
