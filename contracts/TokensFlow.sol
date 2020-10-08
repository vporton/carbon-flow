//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

contract SumOfTokens
{
    function exchangeToParent(uint256 _id) external {
        _doBurn(msg.sender, _id, 0, "");
    }

    function _doBurn(address _from, uint256 _id, uint256 _value, bytes calldata _data) public {
    }
}
