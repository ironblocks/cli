pragma solidity 0.8.19;

   contract example2  is XXXClass{
    constructor() {
    }

    function func1()  {
        require('contract lala is baba {}')
    }

    function func2() external payable {

    }

    function func3() internal firewallProtectedCustom(abi.encodePacked(bytes4(0x1234))) {

    }
}