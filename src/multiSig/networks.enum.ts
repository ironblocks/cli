export enum Network {
    Mainnet = 1,
    Sepolia = 11155111,
    BSC = 56,
    Polygon = 137,
    Other = 0,
    Skip = -1
}

export type AvailableNetwork = Omit<Network, 'Other' | 'Skip'>;

export const NETWORK_QUESTION_CHOICES = Object.keys(Network).filter(key => isNaN(Number(key)));
