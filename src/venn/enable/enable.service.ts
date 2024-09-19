import * as colors from 'colors';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';

import { LoggerService } from '@/lib/logging/logger.service';
import { SupportedVennNetworks } from '@/venn/supported-networks.enum';

export type EnableVennOptions = {
    network: string;
};

@Injectable()
export class EnableVennService {
    constructor(
        private readonly logger: LoggerService,
        private readonly config: ConfigService,
        @Inject('ETHERS') private readonly ethers: typeof import('ethers')
    ) {}

    async enable(options: EnableVennOptions): Promise<boolean> {
        this.logger.log(` -> Network: ${options.network}`);
        await this.validateNetworkConfigs(options.network);
        // verify config with config service, verify that the networks are supported etc
        // verify private key is set
        // set the firewall on all consumers where it's not set
        //

        // await this.deployNewVennPolicy();
        // globally subscribe consumers to the policy on the firewall (if not already subscribed)
        // set the attestation center proxy on all consumers (if not already set)
        // bytes32 private constant ATTESTATION_CENTER_PROXY_SLOT = bytes32(uint256(keccak256("eip1967.attestation.center.proxy")) - 1);
        return true;
    }

    async deployNewVennPolicy() {
        this.logger.log('Deploying new Venn policy');

        // const abiCoder = new this.ethers.AbiCoder();
        // const callData = abiCoder.encode(
        //     ['address', 'address', 'address', 'address[]', 'address[]', 'bool[]'],
        //     [
        //         FIREWALL_ADDRESS, // firewall
        //         owner.address, // defaultAdmin
        //         owner.address, // policyAdmin
        //         [owner.address], // signers
        //         [CONSUMER_ADDRESS], // consumers
        //         [true] // consumerStatuses
        //     ]
        // );
        // const policyDeployer = new ethers.Contract(POLICY_DEPLOYER_ADDRESS, policyDeployerJson.abi, owner);
        // const [policyAddress] = await policyDeployer.callStatic.deployPolicies(
        //     FIREWALL_ADDRESS,
        //     [APPROVED_CALLS_FACTORY_ADDRESS],
        //     [callData]
        // );

        // this.logger.warn(` -> Deployed Approved Calls Policy at: ${policyAddress}`);
        // const tx = await policyDeployer.deployPolicies(FIREWALL_ADDRESS, [APPROVED_CALLS_FACTORY_ADDRESS], [callData]);

        // this.logger.warn(` -> Transaction hash: ${tx.hash}`);
        // const receipt = await tx.wait();

        // this.logger.warn(` -> Mined at block: ${receipt.blockNumber}`);

        // this.logger.success(` -> New policy address: ${policyAddress}`);
        // return policyAddress;
        this.logger.success(' -> New policy address: 0x1234567890');
    }

    async addGlobalPolicyToFirewall(policyAddress: string) {
        // logger.info('Adding global policy to firewall');
        // const firewall = new ethers.Contract(FIREWALL_ADDRESS, firewallJson.abi, owner);
        // const tx = await firewall.addGlobalPolicy(CONSUMER_ADDRESS, policyAddress, { gasLimit: 1000000 });
        // logger.warn(` -> Transaction hash: ${tx.hash}`);
        // const receipt = await tx.wait();
        // logger.warn(` -> Mined at block: ${receipt.blockNumber}`);
        // logger.ok();
    }

    async setAttestationCenterProxyOnConsumer() {
        // logger.info("Setting the Attestation Center Proxy address");
        // logger.warn(` -> Consumer address: ${FIREWALL_CONSUMER}`);
        // logger.warn(` -> Attestation Center Proxy address: ${ATTESTATION_CENTER_PROXY}`);
        // const factory = await hre.ethers.getContractFactory("SafeVault");
        // const tx = await (factory.attach(FIREWALL_CONSUMER) as any).setAttestationCenterProxy(ATTESTATION_CENTER_PROXY);
        // logger.warn(` -> Transaction hash: ${tx.hash}`);
        // const receipt = await tx.wait();
        // logger.warn(` -> Mined in block: ${receipt.blockNumber}`);
        // logger.ok();
        // logger.done("All done!");
    }

    private async validateNetworkConfigs(network: string) {
        const networkIsSupported = Object.values(SupportedVennNetworks).includes(network as SupportedVennNetworks);
        if (!networkIsSupported) {
            throw new Error(`Network ${colors.cyan(network)} is not supported`);
        }

        const networkConfig = this.config.get('networks')[network];
        if (!networkConfig) {
            throw new Error(`Missing configuration for network ${colors.cyan(network)}`);
        }

        const contractsAreConfigured = networkConfig.contracts && Object.keys(networkConfig.contracts).length > 0;
        if (!contractsAreConfigured) {
            throw new Error(`No contracts configured for network ${colors.cyan(network)}`);
        }
    }
}
