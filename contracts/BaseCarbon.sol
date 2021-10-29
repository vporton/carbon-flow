//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "@nomiclabs/buidler/console.sol";
import "./TokensFlow.sol";
import "./ABDKMath64x64.sol";

// TODO: We need multiple competing community funds.
//       Problem: If a local fund (or even a commercial accounter) has too cheap retirement, it's bad for the global community.
//       We can make retired tokens just another kind of fund and retiring be just transfer with tax (energy-efficient?)

contract BaseCarbon is TokensFlow {
    using SafeMath for uint256;
    using ABDKMath64x64 for int128;

    address public globalCommunityFund;
    // uint256 public retiredCreditsToken; // M+ token
    // uint256 public nonRetiredCreditsToken;
    int128 public tax = int128(10).div(100); // 10%

// Admin

    // solhint-disable func-visibility
    // solhint-disable bracket-align
    constructor(address _globalCommunityFund,
                string memory _retiredName, string memory _retiredSymbol, string memory _retiredUri,
                string memory _nonRetiredName, string memory _nonRetiredSymbol, string memory _nonRetiredUri)
    {
        globalCommunityFund = _globalCommunityFund;
        _newToken(0, _retiredName, _retiredSymbol, _retiredUri, _globalCommunityFund); // 1
        _newToken(0, _nonRetiredName, _nonRetiredSymbol, _nonRetiredUri, _globalCommunityFund); // 2
    }
    // solhint-enable bracket-align
    // solhint-enable func-visibility

    function setGlobalCommunityFundAddress(address _globalCommunityFund) external {
        require(msg.sender == globalCommunityFund);
        require(_globalCommunityFund != address(0));
        globalCommunityFund = _globalCommunityFund;
    }

    function setTax(int128 _tax) external {
        require(msg.sender == globalCommunityFund);
        require(_tax >= 0 && _tax < 1<<64); // 0-100%
        tax = _tax;
    }

    // function setMainTokens(uint256 _retiredCreditsToken, uint256 _nonRetiredCreditsToken) external { // needed?
    //     require(msg.sender == globalCommunityFund);
    //     require(_retiredCreditsToken != 0 && _nonRetiredCreditsToken != 0);
    //     retiredCreditsToken = _retiredCreditsToken;
    //     nonRetiredCreditsToken = _nonRetiredCreditsToken;
    // }

// Credits

    // WARNING: If the caller of this function is a contract, it must implement ERC1155TokenReceiver interface.
    function retireCredit(uint _amount) external {
        _doBurn(msg.sender, _nonRetiredCreditsToken(), _amount);
        uint256 _taxAmount = uint256(tax.mulu(_amount));
        bytes memory _data = ""; // efficient?
        _doMint(globalCommunityFund, _retiredCreditsToken(), _taxAmount, _data);
        _doMint(msg.sender, _retiredCreditsToken(), _amount - _taxAmount, _data);
        // emit CreditRetired(creditId); // not needed as _doBurn() emits a suitable event
    }

// Internal

    function _retiredCreditsToken() internal pure returns(uint256) {
        return 1; // M+ token
    }

    function _nonRetiredCreditsToken() internal pure returns(uint256) {
        return 2;
    }

}
