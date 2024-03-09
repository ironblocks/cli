// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@ironblocks/firewall-consumer/contracts/FirewallConsumer.sol";

abstract contract PartiallyAbstract is FirewallConsumer {
    function abstractInternalFunction(bytes calldata param) internal virtual;

    function abstractExternalFunction(bytes calldata param) external virtual;

    function abstractPublicFunction(bytes calldata param) public virtual;

    function nonAbstractPrivateFunction(bytes calldata param) private {
        // some code.
    }

    function nonAbstractInternalFunction(bytes calldata param) internal {
        // some code.
    }

    function nonAbstractExternalFunction(bytes calldata param) external firewallProtected {
        // some code.
    }

    function nonAbstractPublicFunction(bytes calldata param) public {
        // some code.
    }
}
