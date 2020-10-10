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

    struct CarbonCredit {
        address authority;
        uint serial;
        uint256 amount;
        address owner;
        bytes32 arweaveHash;
    }

    // token => Authority
    mapping (uint256 => Authority) public authorities;

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
        Authority memory _authority = Authority({enabled: false, maxSerial: 0, token: _token});
        authorities[_token] = _authority;
        emit AuthorityCreated(msg.sender, _parent, _name, _symbol, _uri);
    }

    // WARNING: If `_owner` is a contract, it must implement ERC1155TokenReceiver interface.
    function createCredit(uint256 _token, uint256 _amount, address _owner, bytes32 _arweaveHash) external returns(uint256) {
        require(tokenOwners[_token] == msg.sender);
        Authority storage _authority = authorities[_token];
        require(_authority.enabled);
        CarbonCredit memory _credit = CarbonCredit({authority: msg.sender,
                                                    serial: ++_authority.maxSerial,
                                                    amount: _amount,
                                                    owner: _owner,
                                                    arweaveHash: _arweaveHash});
        credits[++maxCreditId] = _credit;
        bytes memory _data = ""; // efficient?
        _doMint(_owner, _token, _amount, _data);
        // TODO: event?
        return maxCreditId;
    }

    function setAuthorityEnabled(uint256 _token, bool _enabled) external {
        Authority storage _authority = authorities[_token];

        bool _found = false;
        for(uint256 _id = tokenFlow[_authority.token].parentToken; _id != 0; _id = tokenFlow[_id].parentToken) {
            require(_id != _authority.token); // Prevent irrevocably disable itself, also save gas.
            if(!authorities[_id].enabled) {
                break; // A disabled entity cannot enable/disable other entities.
            }
            if(msg.sender == tokenOwners[_id]) {
                _found = true;
                break;
            }
        }
        require(_found);

        _authority.enabled = _enabled;
        // TODO: event
    }

    function _setTokenParent(uint256 _child, uint256 _parent) override internal {
        // require(_child <= maxTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        super._setTokenParent(_child, _parent);
        authorities[_child].enabled = false;
    }

    event AuthorityCreated(address owner, uint256 parent, string name, string symbol, string uri);
}
