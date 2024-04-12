
import { Injectable } from '@nestjs/common';
import { InquirerService } from 'nest-commander';
import { NetworkAnswers } from './network.questions';
import { NETWORK_QUESTION_SET_NAME } from './network.questions.descriptor';

@Injectable()
export class NetworkService {
    constructor(private readonly inquirer: InquirerService) {}

    async askToChooseNetwork(): Promise<number> {
        return (await this.inquirer.ask<NetworkAnswers>(NETWORK_QUESTION_SET_NAME, {})).chooseNetwork;
    }
}
