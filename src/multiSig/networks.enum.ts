export enum Network {
    Mainnet = 1,
    Sepolia = 11155111,
    BSC = 56,
    Polygon = 137,
    Other = 0,
    Skip = -1
}

export type SupportedNetworks = Exclude<Network, Network.Other | Network.Skip>;
