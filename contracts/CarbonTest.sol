//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/hardhat/console.sol';

import "./Carbon.sol";

contract CarbonTest is Carbon {
    int private timestamp = 10000; // an arbitrary value for testing

    // solhint-disable func-visibility
    // solhint-disable bracket-align
    constructor(address _globalCommunityFund,
                string memory _retiredName, string memory _retiredSymbol, string memory _retiredUri,
                string memory _nonRetiredName, string memory _nonRetiredSymbol, string memory _nonRetiredUri)
        Carbon(
            _globalCommunityFund,
            _retiredName, _retiredSymbol, _retiredUri, _nonRetiredName, _nonRetiredSymbol, _nonRetiredUri)
    { }
    // solhint-enable bracket-align
    // solhint-enable func-visibility

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
