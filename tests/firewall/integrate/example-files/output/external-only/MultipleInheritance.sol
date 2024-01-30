// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

import "@ironblocks/firewall-consumer/contracts/FirewallConsumer.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract MultipleInheritance is
    FirewallConsumer,
    Base1,
    Base2,
    Base3,
    Base4,
    AccessControl
{
    /**
        Some
        Multi-line
        comment.

        // inner inline comment attempting to fool the parser.

    */
    bool public invoked = false;

    function externalFunction(bytes calldata param) external firewallProtected {
        // some code
    }
}
