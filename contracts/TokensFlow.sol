//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

contract TokensFlow
{
    function exchangeToParent(uint256 _id) external {
        _doBurn("");
    }

    function _doBurn(bytes calldata _data) internal {
    }
}
