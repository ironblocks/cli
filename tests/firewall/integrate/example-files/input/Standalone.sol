// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

contract Standalone {
    /**
        Some
        Multi-line
        comment.

        // inner inline comment attempting to fool the parser.

     */
    bool public invoked = false;

    function externalFunction(bytes calldata param) external {
        // some code
    }

    function externalOverrideFunction(bytes calldata param) external override {
        // some code
    }

    function externalOverrideFunctionWithTypes(
        address param1,
        bytes calldata param2
    ) external override returns (bool res1, bytes memory res2) {
        // some pre execution code

        unchecked {
            someMapping[someAddress] = someMapping[someAddress] - someMapping[address(0)];
        }
        // todo: this is just a comment.

        // some post execution code
    }

    // Pure functions are ignored.
    function pureExternalFunction(address param1) external pure {
        return address(0);
    }

    // Pure functions are ignored.
    function pureExternalFunctionMultipleModifiers(address param1)
        external
        pure
        modifier1
        modifier2
        modifier3
        returns (address)
    {
        return address(0);
    }

    function externalFunctionMultipleModifiers(address param1)
        external
        modifier1
        modifier2
        modifier3
        returns (address)
    {
        invoked = true;
    }


    function externalFunctionComplexTypes(
        bool _booleanVar,
        uint256 _uintVar,
        int256 _intVar,
        address _addressVar,
        bytes32 _fixedBytesVar,
        bytes memory _dynamicBytesVar,
        string memory _stringVar,
        CustomStruct memory _structVar,
        ExampleEnum _enumVar,
        uint[] memory _dynamicArrayVar,
        uint[5] memory _fixedArrayVar,
        address payable _payableAddressVar,
        uint256 _storageVar
    ) external {
        invoked = true;
    }

    function internalFunctionComplexTypes(
        bool _booleanVar,
        uint256 _uintVar,
        int256 _intVar,
        address _addressVar,
        bytes32 _fixedBytesVar,
        bytes memory _dynamicBytesVar,
        string memory _stringVar,
        CustomStruct memory _structVar,
        ExampleEnum _enumVar,
        uint[] memory _dynamicArrayVar,
        uint[5] memory _fixedArrayVar,
        address payable _payableAddressVar,
        uint256 _storageVar
    ) internal {

        // Additional implementation logic here, if needed
    }

    function internalFunctionMoreComplexTypes(
        bool flag,
        uint256 number,
        address ethAddress,
        bytes32 fixedBytes,
        string memory text,
        uint[] memory dynamicArray,
        uint256[2] calldata _strike,
        uint256[2][] calldata _strikeBr,
        address payable payableAddress,
        bytes memory dynamicBytes,
        CustomStruct memory customStruct,
        CustomStruct[] customStruct2,
        CustomStruct[3] customStruct3
    ) internal {
        // Function implementation here
    }

    // Pure functions are ignored.
    function pureInternalFunctionMoreComplexTypes(
        bool _longFlag,
        string calldata _ticker,
        uint256 _expiration,
        uint256[2] calldata _strike,
        uint256[2][] calldata _strikeBr,
        string calldata _decimalStrike,
        uint256 _contractType,
        address _marketMaker,
        Box n,
        Box[2][3][1][] n,
        uint256 x
    ) internal pure returns (address) {
        return address(0);
    }
}
