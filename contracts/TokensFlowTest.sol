//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/buidler/console.sol';

import "./TokensFlow.sol";

contract TokensFlowTest is TokensFlow {
    int private timestamp = 10000; // an arbitrary value for testing

    function mint(address _to, uint256 _id, uint256 _value, bytes calldata _data) external {
        require(tokenOwners[_id] == msg.sender);
        // require(_id != 0);
        // require(tokenFlow[_id].enabled);

        _doMint(_to, _id, _value, _data);
    }

    function _currentTime() internal override view returns(int) {
        return timestamp;
    }

    function currentTime() external view returns(int) {
        return _currentTime();
    }

    function setCurrentTime(int _timestamp) external {
        require(_timestamp >= timestamp);
        timestamp = _timestamp;
    }
}
