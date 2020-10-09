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
    struct CarbonCredit {
        address authority;
        uint serial; // FIXME: individual for each authority
        uint256 amount;
        address owner;
        bool retired;
        uint256 arweaveHash; // TODO: big or little endian?
    }

    address public globalCommunityFund;
    uint256 public mainToken;
    int128 public tax = int128(10).div(100); // 10%

    mapping (address => bool) public carbonCreditAuthorities; // TODO: Also hold the account of non-retired tokens it created and allow to delete these tokens
    mapping (address => bool) public issuers; // who can retire

    mapping (uint => CarbonCredit) public credits; // TODO: needed?
    uint public maxCreditId;

    mapping (address => uint256) public nonRetiredCredits;

// Admin

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

    function setMainToken(uint256 _mainToken) external {
        require(msg.sender == globalCommunityFund);
        mainToken = _mainToken;
    }

// Credits

    constructor(address _globalCommunityFund) {
        globalCommunityFund = _globalCommunityFund;
    }

    function createCredit(address _owner, uint256 _amount, uint256 _arweaveHash) external /*returns(uint _creditId)*/ {
        require(carbonCreditAuthorities[msg.sender]);
        // CarbonCredit memory credit = CarbonCredit({authority: msg.sender,
        //                                            serial: _serial, // FIXME
        //                                            amount: _amount,
        //                                            owner: _owner,
        //                                            retired: false,
        //                                            arweaveHash: _arweaveHash});
        // credits[++maxCreditId] = credit;
        nonRetiredCredits[_owner] = _amount.add(nonRetiredCredits[_owner]);
        // emit CreditCreated(maxCreditId); // TODO: More arguments?
        // return maxCreditId;
    }

    // TODO: list of signers in a separate contract
    function retireCredit(uint _amount) external {
        nonRetiredCredits[msg.sender] = nonRetiredCredits[msg.sender].sub(_amount);
        require(mainToken != 0); // TODO: check necessary?
        uint256 _taxAmount = uint256(tax.mulu(_amount));
        bytes calldata _data;
        _doMint(globalCommunityFund, mainToken, _taxAmount, _data);
        _doMint(msg.sender, mainToken, _amount - _taxAmount, _data);
        // emit CreditRetired(creditId); // TODO
    }

// Admin

    function createCarbonCreditAuthority(address _authority) external {
        require(msg.sender == globalCommunityFund);
        carbonCreditAuthorities[_authority] = true;
        // TODO: event
    }

    function deleteCarbonCreditAuthority(address _authority) external {
        require(msg.sender == globalCommunityFund);
        carbonCreditAuthorities[_authority] = false;
        // TODO: event
    }

    function createIssuer(address _issuer) external {
        require(msg.sender == globalCommunityFund);
        issuers[_issuer] = true;
        // TODO: event
    }

    function deleteIssuer(address _issuer) external {
        require(msg.sender == globalCommunityFund);
        issuers[_issuer] = false;
        // TODO: event
    }

// Events

    event CreditCreated(uint creditId); // TODO: remove?
}
