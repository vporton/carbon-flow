//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// FIXME: Voting by retiring carbon. It requires third-party approvals of retiring. (Also approvals of swaps?)

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
        string fileCoinHash;
    }

    // token => Authority
    mapping (uint256 => Authority) public authorities;

    mapping (uint256 => MintRecord) public credits;

    uint256 public maxCreditId;

    // solhint-disable func-visibility
    // solhint-disable bracket-align
    constructor()
        BaseCarbon()
    {
        nextTokenId = 1; // Non-retired token IDs are odd numbers,
    }
    // solhint-enable bracket-align
    // solhint-enable func-visibility

    // Anybody can create an authority, but its parent decides if its tokens can be swapped.
    function createAuthority(string calldata _nonRetiredUri, string calldata _retiredUri) external {
        // Minting restricted because minting can happen only through createCredit().
        uint256 _nonRetiredToken = _newToken(_nonRetiredUri, msg.sender); // always odd, see also `isNonRetiredToken`.
        /*uint256 _retiredToken = */_newToken(_retiredUri, address(0)); // + 1
        Authority memory _authority = Authority({maxSerial: 0, token: _nonRetiredToken});
        authorities[_nonRetiredToken] = _authority;
        emit AuthorityCreated(msg.sender, _nonRetiredToken);
    }

    // WARNING: If `_owner` is a contract, it must implement ERC1155TokenReceiver interface.
    // Additional data (such as the list of signers) is provided in FileCoin.
    function createCredit(uint256 _token, uint256 _amount, address _owner, string calldata _fileCoinHash)
        external returns(uint256)
    {
        require(tokenOwners[_token] == msg.sender);
        Authority storage _authority = authorities[_token];
        MintRecord memory _credit = MintRecord({
            authority: msg.sender,
            serial: ++_authority.maxSerial,
            amount: _amount,
            owner: _owner,
            fileCoinHash: _fileCoinHash
        });
        credits[++maxCreditId] = _credit;
        bytes memory _data = ""; // efficient?
        _doMint(_owner, _token, _amount, _data);
        emit CreditCreated(maxCreditId, msg.sender, _authority.maxSerial, _amount, _owner, _fileCoinHash);
        return maxCreditId;
    }

    function _setTokenParent(uint256 _child, uint256 _parent, bool _value) internal {
        // require(_child != 0 && _child < nextTokenId); // not needed
        // require(_parent != 0 && _parent < nextTokenId); // caller's responsibility
        require(msg.sender == tokenOwners[_child]);

        _setTokenParentNoCheck(_child, _parent, _value);
    }

    event AuthorityCreated(address indexed owner, uint256 indexed token);
    event CreditCreated(uint256 indexed id,
                        address indexed authority,
                        uint indexed serial,
                        uint256 amount,
                        address owner,
                        string fileCoinHash);
}
