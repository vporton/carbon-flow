//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './BaseCarbon.sol';

contract Carbon is BaseCarbon
{
    struct Authority {
        bool enabled;
        uint256 token;
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

    mapping (address => Authority) public authorities;

    mapping (uint256 => CarbonCredit) public credits;

    uint256 maxCreditId;

    constructor(address _globalCommunityFund,
                string memory _retiredName, string memory _retiredSymbol, string memory _retiredUri,
                string memory _nonRetiredName, string memory _nonRetiredSymbol, string memory _nonRetiredUri)
        BaseCarbon(_globalCommunityFund,
                   _retiredName, _retiredSymbol, _retiredUri, _nonRetiredName, _nonRetiredSymbol, _nonRetiredUri)
    { }

    // Anybody can create an authority, but its parent decides if its tokens can be swapped.
    function createAuthority(uint256 _parent, string calldata _name, string calldata _symbol, string calldata _uri) external {
        // require(msg.sender == globalCommunityFund;
        // Minting restricted because minting can happen only through createCredit().
        uint256 _token = _newToken(_parent, false, _name, _symbol, _uri);
        Authority memory _authority = Authority({enabled: true, maxSerial: 0, token: _token});
        authorities[msg.sender] = _authority;
        emit AuthorityCreated(msg.sender, _parent, _name, _symbol, _uri);
    }

    function setAuthorityEnabled(address _address, bool _enabled) external {
        require(msg.sender == globalCommunityFund); // FIXME: its parent should be able to do this instead
        authorities[_address].enabled = _enabled;
        // TODO: event
    }

    // WARNING: If `_owner` is a contract, it must implement ERC1155TokenReceiver interface.
    function createCredit(uint256 _amount, address _owner, uint256 _arweaveHash) external returns(uint256) {
        Authority storage _authority = authorities[msg.sender];
        require(_authority.enabled);
        CarbonCredit memory _credit = CarbonCredit({authority: msg.sender,
                                                    serial: ++_authority.maxSerial,
                                                    amount: _amount,
                                                    owner: _owner,
                                                    arweaveHash: _arweaveHash});
        credits[++maxCreditId] = _credit;
        bytes memory _data = ""; // efficient?
        _doMint(_owner, _authority.token, _amount, _data);
        // TODO: event?
        return maxCreditId;
    }

    event AuthorityCreated(address owner, uint256 parent, string name, string symbol, string uri);
}
