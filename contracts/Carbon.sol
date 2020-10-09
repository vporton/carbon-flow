//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './TokensFlow.sol';
import './ABDKMath64x64.sol';

contract Carbon is TokensFlow
{
    using SafeMath for uint256;
    using ABDKMath64x64 for int128;

    // TODO: Limit the amount of credits authorities issue

    // TODO: Only as an event? TODO: rename
    // struct CarbonCredit {
    //     address authority;
    //     uint serial; // FIXME: individual for each authority
    //     uint256 amount;
    //     address owner;
    //     bool retired;
    //     uint256 arweaveHash; // TODO: big or little endian?
    // }

    address public globalCommunityFund;
    uint256 public mainToken; // TODO: rename
    uint256 public nonRetiredCredits;
    int128 public tax = int128(10).div(100); // 10%

// Admin

    constructor(address _globalCommunityFund,
                string memory _retiredName, string memory _retiredSymbol, string memory _retiredUri,
                string memory _nonRetiredName, string memory _nonRetiredSymbol, string memory _nonRetiredUri)
    {
        globalCommunityFund = _globalCommunityFund;
        mainToken = _newToken2(0, _retiredName, _retiredSymbol, _retiredUri);
        nonRetiredCredits = _newToken2(0, _nonRetiredName, _nonRetiredSymbol, _nonRetiredUri);
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

    function setMainTokens(uint256 _mainToken, uint256 _nonRetiredCredits) external { // needed?
        require(msg.sender == globalCommunityFund);
        require(_mainToken != 0 && _nonRetiredCredits != 0);
        mainToken = _mainToken;
        nonRetiredCredits = _nonRetiredCredits;
    }

// Credits

    // TODO: list of signers in a separate contract
    function retireCredit(uint _amount) external {
        _doBurn(msg.sender, nonRetiredCredits, _amount);
        uint256 _taxAmount = uint256(tax.mulu(_amount));
        bytes memory _data = ""; // efficient?
        _doMint(globalCommunityFund, mainToken, _taxAmount, _data);
        _doMint(msg.sender, mainToken, _amount - _taxAmount, _data);
        // emit CreditRetired(creditId); // TODO
    }

// Events

    event CreditCreated(uint creditId); // TODO: remove?
}
