//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './TokensFlow.sol';
import './ABDKMath64x64.sol';

abstract contract Carbon is TokensFlow
{
    using ABDKMath64x64 for int128;

    struct CarbonCreditAuthority {
        uint256 token;
    }

    struct RetirementIssuer {
        uint256 token;
    }
    
    struct CarbonCredit {
        address authority;
        uint serial;
        uint256 amount;
        address issuer; // FIXME
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
        _checkCanRetire();
        credit.retired = true;
        // TODO
    }

    function _checkCanRetire() internal {
        // TODO
    }
}
