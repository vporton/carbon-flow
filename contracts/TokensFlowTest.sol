//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/buidler/console.sol';

import "./TokensFlow.sol";

contract TokensFlowTest is TokensFlow
{
    uint timestamp = 10000; // an arbitrary value for testing

    function _currentTime() internal override view returns(uint256) {
        return timestamp;
    }

    function currentTime() external view returns(uint256) {
        return _currentTime();
    }

    function setCurrentTime(uint256 _timestamp) external {
        require(_timestamp >= timestamp);
        timestamp = _timestamp;
    }
}
