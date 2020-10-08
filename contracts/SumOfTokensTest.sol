//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./SumOfTokens.sol";

contract SumOfTokensTest is SumOfTokens
{
    constructor(address _owner) SumOfTokens(_owner) { }

    function mint(address _to, uint256 _id, uint256 _value, bytes calldata _data) external {
        require(tokenOwners[_id] == msg.sender);
        // require(_id != 0);

        _doMint(_to, _id, _value, _data);
    }
}
