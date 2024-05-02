import { skip } from 'node:test';

export enum Network {
    Mainnet = 1,
    Sepolia = 11155111,
    BSC = 56,
    Polygon = 137,
    Other = 0,
    Skip = -1
}

type ExcludeOtherAndSkip<T> = T extends Network.Other | Network.Skip ? never : T;

export type SupportedNetworks = ExcludeOtherAndSkip<Network>;

export const NETWORK_QUESTION_CHOICES = Object.keys(Network).filter(key => isNaN(Number(key)));