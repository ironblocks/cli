import { Network } from './networks.enum';

export const NETWORK_QUESTION_TYPE = 'list';
export const NETWORK_QUESTION_NAME = 'chooseNetwork';
export const NETWORK_QUESTION_SET_NAME = 'network';
export const NETWORK_QUESTION_MESSAGE =
    "CLI supports SAFE multisig addresses out of the box. To ensure the validity of the multisig address, please choose one of the available networks and the address will be validated by the SAFE service. Select 'skip' in case you don't have multisig!";

export const NETWORK_QUESTION_CHOICES = Object.keys(Network).filter(key => isNaN(Number(key)));
