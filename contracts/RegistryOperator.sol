//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './Carbon.sol';

contract RegistryOperator
{
    // TODO: Limit max amount per time period for an authority.
    struct Authority {
        bool enabled;
        uint maxSerial;
    }

    // TODO: rename // TODO: only event?
    struct CarbonCredit {
        address authority;
        uint serial;
        uint256 amount;
        address owner;
        uint256 arweaveHash; // TODO: big or little endian?
    }

    Carbon public carbonRegistry; // TODO: Allow to set it?

    mapping (address => Authority) public authorities;

    mapping (uint256 => CarbonCredit) public credits;

    uint256 maxCreditId;

    constructor(Carbon _carbonRegistry) {
        carbonRegistry = _carbonRegistry;
    }

    function createAuthority(address _address) external {
        require(msg.sender == carbonRegistry.globalCommunityFund());
        Authority memory _authority = Authority({enabled: true, maxSerial: 0});
        authorities[_address] = _authority;
        // TODO: event
    }

    function setAuthorityEnabled(address _address, bool _enabled) external {
        require(msg.sender == carbonRegistry.globalCommunityFund());
        authorities[_address].enabled = _enabled;
        // TODO: event
    }

    function createCredit(uint256 _amount, address _owner, uint256 _arweaveHash) external returns(uint256) {
        Authority storage _authority = authorities[msg.sender];
        require(_authority.enabled);
        CarbonCredit memory _credit = CarbonCredit({authority: msg.sender,
                                                    serial: ++_authority.maxSerial,
                                                    amount: _amount,
                                                    owner: _owner,
                                                    arweaveHash: _arweaveHash});
        credits[++maxCreditId] = _credit;
        // TODO: event
        return maxCreditId;
    }
}
