//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import './SumOfTokens.sol';

abstract contract Carbon is SumOfTokens
{
    struct CarbonCreditAuthority {
        uint256 token;
    }

    struct RetirementIssuer {
        uint timePeriod; // in seconds
        uint timePeriodStart; // in seconds from epoch
        uint256 maxCreditsToRetirePerPeriod;
        uint256 maxAmountToRetirePerPeriod;
        uint lastCountedPeriod;
        uint256 creditsRetiredInLastCountedPeriod;
        uint256 amountRetiredInLastCountedPeriod;
    }
    
    struct CarbonCredit {
        address authority;
        uint serial;
        uint256 amount;
        address issuer;
        bool retired;
        uint256 arweaveHash; // TODO: big or little endian?
    }

    mapping (address => CarbonCreditAuthority) carbonCreditAuthorities;
    mapping (address => RetirementIssuer) retirementIssuers;

    mapping (uint => CarbonCredit) credits;
    uint maxCreditId;

// Credits

    function createCredit(uint _serial, uint256 _amount, uint256 _arweaveHash) external returns(uint _creditId) {
        require(carbonCreditAuthorities[msg.sender].token != 0);
        CarbonCredit memory credit = CarbonCredit({authority: msg.sender,
                                                   serial: _serial,
                                                   amount: _amount,
                                                   issuer: address(0),
                                                   retired: false,
                                                   arweaveHash: _arweaveHash});
        credits[++maxCreditId] = credit;
        // TODO: emit event
        return maxCreditId;
    }

    function retireCredit(uint creditId) external {
        CarbonCredit storage credit = credits[creditId];
        require(!credit.retired, "Credit is already retired");
        // TODO
    }
}
