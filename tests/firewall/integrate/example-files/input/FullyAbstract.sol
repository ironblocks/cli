// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

/**
 * Nothing to customize.
 */
abstract contract FullyAbstract {
    function abstractExternalFunction(bytes calldata param) external virtual;
}
