//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './TokensFlow.sol';
import './ABDKMath64x64.sol';

abstract contract Carbon is TokensFlow
{
    using ABDKMath64x64 for int128;

    struct CarbonCredit {
        address authority;
        uint serial;
        uint256 amount;
        address owner;
        bool retired;
        uint256 arweaveHash; // TODO: big or little endian?
    }

    address globalCommunityFund;
    int128 tax = int128(10).div(100); // 10%

    mapping (address => bool) carbonCreditAuthorities;

    mapping (uint => CarbonCredit) credits;
    uint maxCreditId;

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

// Credits

    constructor(address _globalCommunityFund) {
        globalCommunityFund = _globalCommunityFund;
    }

    function createCredit(uint _serial, address _owner, uint256 _amount, uint256 _arweaveHash) external returns(uint _creditId) {
        require(carbonCreditAuthorities[msg.sender]);
        CarbonCredit memory credit = CarbonCredit({authority: msg.sender,
                                                   serial: _serial,
                                                   amount: _amount,
                                                   owner: _owner,
                                                   retired: false,
                                                   arweaveHash: _arweaveHash});
        credits[++maxCreditId] = credit;
        emit CreditCreated(maxCreditId); // TODO: More arguments?
        return maxCreditId;
    }

    function retireCredit(uint creditId) external {
        uint256 _token = ownerTokens[msg.sender];
        require(_token != 0); // We are an issuer.
        CarbonCredit storage credit = credits[creditId];
        require(!credit.retired, "Credit is already retired");
        credit.retired = true;
        uint256 _value = credit.amount;
        uint256 _taxAmount = uint256(tax.mulu(_value));
        bytes calldata _data;
        _doMint(globalCommunityFund, _token, _taxAmount, _data);
        _doMint(credit.owner, _token, _value - _taxAmount, _data);
        emit CreditRetired(creditId); // TODO: More arguments?
    }

// Events

// Admin

    function createCarbonCreditAuthority(address _authority) external {
        require(msg.sender == globalCommunityFund);
        carbonCreditAuthorities[_authority] = true;
    }

    function deleteCarbonCreditAuthority(address _authority) external {
        require(msg.sender == globalCommunityFund);
        carbonCreditAuthorities[_authority] = false;
    }

    event CreditCreated(uint creditId);
    event CreditRetired(uint creditId);
}
