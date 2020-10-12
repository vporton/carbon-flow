//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/buidler/console.sol';
import './BaseCarbon.sol';

contract Carbon is BaseCarbon
{
    struct Authority {
        uint256 token;
        uint maxSerial;
    }

    struct CarbonCreditsRecord {
        address authority;
        uint serial;
        uint256 amount;
        address owner;
        bytes32 arweaveHash;
    }

    // token => Authority
    mapping (uint256 => Authority) public authorities;

    mapping (uint256 => CarbonCreditsRecord) public credits;

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
        uint256 _token = _newToken(_parent, _name, _symbol, _uri, msg.sender);
        Authority memory _authority = Authority({maxSerial: 0, token: _token});
        authorities[_token] = _authority;
        emit AuthorityCreated(msg.sender, _token, _name, _symbol, _uri);
    }

    // WARNING: If `_owner` is a contract, it must implement ERC1155TokenReceiver interface.
    // Additional data (such as the list of signers) is provided in Arweave.
    function createCredit(uint256 _token, uint256 _amount, address _owner, bytes32 _arweaveHash) external returns(uint256) {
        require(tokenOwners[_token] == msg.sender && tokenFlow[_token].enabled);
        Authority storage _authority = authorities[_token];
        CarbonCreditsRecord memory _credit = CarbonCreditsRecord({authority: msg.sender,
                                                                  serial: ++_authority.maxSerial,
                                                                  amount: _amount,
                                                                  owner: _owner,
                                                                  arweaveHash: _arweaveHash});
        credits[++maxCreditId] = _credit;
        bytes memory _data = ""; // efficient?
        _doMint(_owner, _token, _amount, _data);
        emit CreditCreated(maxCreditId, msg.sender, _authority.maxSerial, _amount, _owner, _arweaveHash);
        return maxCreditId;
    }

    function _setTokenParent(uint256 _child, uint256 _parent) internal {
        // require(_child != 0 && _child <= maxTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        _setTokenParentNoCheck(_child, _parent);
    }

    event AuthorityCreated(address indexed owner, uint256 indexed token, string name, string symbol, string uri);
    event CreditCreated(uint256 indexed id, address indexed authority, uint indexed serial, uint256 amount, address owner, bytes32 arweaveHash);
}
