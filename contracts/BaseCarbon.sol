//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './TokensFlow.sol';
import './ABDKMath64x64.sol';

contract BaseCarbon is TokensFlow
{
    using SafeMath for uint256;
    using ABDKMath64x64 for int128;

    address public globalCommunityFund;
    uint256 public retiredCreditsToken; // M+ token
    uint256 public nonRetiredCreditsToken;
    int128 public tax = int128(10).div(100); // 10%

// Admin

    constructor(address _globalCommunityFund,
                string memory _retiredName, string memory _retiredSymbol, string memory _retiredUri,
                string memory _nonRetiredName, string memory _nonRetiredSymbol, string memory _nonRetiredUri)
    {
        globalCommunityFund = _globalCommunityFund;
        retiredCreditsToken = _newToken2(0, true, _retiredName, _retiredSymbol, _retiredUri, _globalCommunityFund);
        nonRetiredCreditsToken = _newToken2(0, false, _nonRetiredName, _nonRetiredSymbol, _nonRetiredUri, _globalCommunityFund);
    }

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

    function setMainTokens(uint256 _retiredCreditsToken, uint256 _nonRetiredCreditsToken) external { // needed?
        require(msg.sender == globalCommunityFund);
        require(_retiredCreditsToken != 0 && _nonRetiredCreditsToken != 0);
        retiredCreditsToken = _retiredCreditsToken;
        nonRetiredCreditsToken = _nonRetiredCreditsToken;
    }

// Credits

    // TODO: list of signers in a separate contract
    // WARNING: If the caller of this function is a contract, it must implement ERC1155TokenReceiver interface.
    function retireCredit(uint _amount) external {
        _doBurn(msg.sender, nonRetiredCreditsToken, _amount);
        uint256 _taxAmount = uint256(tax.mulu(_amount));
        bytes memory _data = ""; // efficient?
        _doMint(globalCommunityFund, retiredCreditsToken, _taxAmount, _data);
        _doMint(msg.sender, retiredCreditsToken, _amount - _taxAmount, _data);
        // emit CreditRetired(creditId); // TODO
    }

// Events

    event CreditCreated(uint creditId); // TODO: remove?
}
