//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/hardhat/console.sol';
import "./BaseCarbon.sol";

contract Carbon is BaseCarbon {
    struct Authority {
        uint256 token;
        uint maxSerial;
    }

    struct MintRecord {
        address authority;
        uint serial;
        uint256 amount;
        address owner;
        bytes32 arweaveHash;
    }

    // token => Authority
    mapping (uint256 => Authority) public authorities;

    mapping (uint256 => MintRecord) public credits;

    uint256 public maxCreditId;

    // solhint-disable func-visibility
    // solhint-disable bracket-align
    // TODO: Set token URIs.
    constructor()
        BaseCarbon()
    {
        nextTokenId = 1; // Non-retired token IDs are odd numbers,
    }
    // solhint-enable bracket-align
    // solhint-enable func-visibility

    // Anybody can create an authority, but its parent decides if its tokens can be swapped.
    function createAuthority(uint256 _parent, string calldata _nonRetiredUri, string calldata _retiredUri) external {
        // Minting restricted because minting can happen only through createCredit().
        uint256 _nonRetiredToken = _newToken(_parent, _nonRetiredUri, msg.sender); // always odd, see also `isNonRetiredToken`.
        /*uint256 _retiredToken = */_newToken(0, _retiredUri, address(0)); // + 1
        Authority memory _authority = Authority({maxSerial: 0, token: _nonRetiredToken});
        authorities[_nonRetiredToken] = _authority;
        emit AuthorityCreated(msg.sender, _nonRetiredToken);
    }

    // WARNING: If `_owner` is a contract, it must implement ERC1155TokenReceiver interface.
    // Additional data (such as the list of signers) is provided in Arweave.
    function createCredit(uint256 _token, uint256 _amount, address _owner, bytes32 _arweaveHash)
        external returns(uint256)
    {
        require(tokenOwners[_token] == msg.sender && tokenFlow[_token].enabled);
        Authority storage _authority = authorities[_token];
        MintRecord memory _credit = MintRecord({
            authority: msg.sender,
            serial: ++_authority.maxSerial,
            amount: _amount,
            owner: _owner,
            arweaveHash: _arweaveHash
        });
        credits[++maxCreditId] = _credit;
        bytes memory _data = ""; // efficient?
        _doMint(_owner, _token, _amount, _data);
        emit CreditCreated(maxCreditId, msg.sender, _authority.maxSerial, _amount, _owner, _arweaveHash);
        return maxCreditId;
    }

    function _setTokenParent(uint256 _child, uint256 _parent) internal {
        // require(_child != 0 && _child < nextTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        _setTokenParentNoCheck(_child, _parent);
    }

    event AuthorityCreated(address indexed owner, uint256 indexed token);
    event CreditCreated(uint256 indexed id,
                        address indexed authority,
                        uint indexed serial,
                        uint256 amount,
                        address owner,
                        bytes32 arweaveHash);
}
