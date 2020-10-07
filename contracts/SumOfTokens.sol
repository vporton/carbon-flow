//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

// import '@nomiclabs/buidler/console.sol';

import "./ERC1155.sol";
import "./IERC1155Views.sol";

contract SumOfTokens is ERC1155, IERC1155Views
{
    using SafeMath for uint256;
    using Address for address;

    address public owner;

    // double linked list
    struct UserToken {
        uint256 token;
        bytes32 next;
    }

    uint256 public maxTokenId;

    mapping (uint256 => address) public tokenOwners;

    mapping (uint256 => uint256) public parentToken;

    // user => (parent => obj)
    mapping (address => mapping (uint256 => bytes32)) userTokens;

    mapping (bytes32 => UserToken) public userTokensObjects;

    constructor(address _owner) {
        owner = _owner;
    }

    function mint(address _to, uint256 _id, uint256 _value, bytes calldata _data) external {
        require(tokenOwners[_id] == msg.sender);
        // require(_id != 0);

        require(_to != address(0), "_to must be non-zero.");

        _doMint(_to, _id, _value);

        // MUST emit event
        emit TransferSingle(msg.sender, address(0), _to, _id, _value);

        // Now that the balance is updated and the event was emitted,
        // call onERC1155Received if the destination is a contract.
        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(msg.sender, address(0), _to, _id, _value, _data);
        }
    }

    // TODO: mintBatch

// ERC-1155

    function balanceOf(address _owner, uint256 _id) external view override returns (uint256) {
        return _balanceOf(_owner, _id);
    }

    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view override returns (uint256[] memory) {
        require(_owners.length == _ids.length);
        uint256[] memory _balances = new uint256[](_owners.length);
        for (uint256 i = 0; i < _owners.length; ++i) {
            _balances[i] = _balanceOf(_owners[i], _ids[i]);
        }
        return _balances;
    }

    function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _value, bytes calldata _data) external override {
        require(_id != 0, "destination address must be non-zero.");

        require(_to != address(0), "_to must be non-zero.");
        require(_from == msg.sender || _allowance(_id, _from, msg.sender) >= _value, "Not appoved to transfer");

        (uint256 _transferred,) = _doTransferFrom(_from, _to, _id, _value);
        require(_transferred == _value);

        // MUST emit event
        emit TransferSingle(msg.sender, _from, _to, _id, _value);

        // Now that the balance is updated and the event was emitted,
        // call onERC1155Received if the destination is a contract.
        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(msg.sender, _from, _to, _id, _value, _data);
        }
    }

    function safeBatchTransferFrom(address _from, address _to, uint256[] calldata _ids, uint256[] calldata _values, bytes calldata _data) external override {

        // MUST Throw on errors
        require(_to != address(0), "destination address must be non-zero.");
        require(_ids.length == _values.length, "_ids and _values array length must match.");
        if(_from != msg.sender) {
            for (uint256 i = 0; i < _ids.length; ++i) {
                require(_allowance(_ids[i], _from, msg.sender) >= _values[i], "Not appoved to transfer");
            }
        }

        for (uint256 i = 0; i < _ids.length; ++i) {
            uint256 _id = _ids[i];
            require(_id != 0);
            uint256 _value = _values[i];

            (uint256 _transferred,) = _doTransferFrom(_from, _to, _id, _value);
            require(_transferred == _value);
        }

        // Note: instead of the below batch versions of event and acceptance check you MAY have emitted a TransferSingle
        // event and a subsequent call to _doSafeTransferAcceptanceCheck in above loop for each balance change instead.
        // Or emitted a TransferSingle event for each in the loop and then the single _doSafeBatchTransferAcceptanceCheck below.
        // However it is implemented the balance changes and events MUST match when a check (i.e. calling an external contract) is done.

        // MUST emit event
        emit TransferBatch(msg.sender, _from, _to, _ids, _values);

        // Now that the balances are updated and the events are emitted,
        // call onERC1155BatchReceived if the destination is a contract.
        if (_to.isContract()) {
            _doSafeBatchTransferAcceptanceCheck(msg.sender, _from, _to, _ids, _values, _data);
        }
    }

// IERC1155Views

    mapping (uint256 => uint256) public totalSupplyImpl;
    mapping (uint256 => string) public nameImpl;
    mapping (uint256 => string) public symbolImpl;
    mapping (uint256 => string) public uriImpl;

    function totalSupply(uint256 _id) external override view returns (uint256) {
        return totalSupplyImpl[_id];
    }

    function name(uint256 _id) external override view returns (string memory) {
        return nameImpl[_id];
    }

    function symbol(uint256 _id) external override view returns (string memory) {
        return symbolImpl[_id];
    }

    function decimals(uint256) external override pure returns (uint8) {
        return 18;
    }

    function uri(uint256 _id) external override view returns (string memory) {
        return uriImpl[_id];
    }

// Administrativia

    function newToken(string calldata _name, string calldata _symbol, string calldata _uri) external returns (uint256) {
        tokenOwners[++maxTokenId] = msg.sender;

        nameImpl[maxTokenId] = _name;
        symbolImpl[maxTokenId] = _symbol;
        uriImpl[maxTokenId] = _uri;

        emit NewToken(maxTokenId, _name, _symbol, _uri);

        return maxTokenId;
    }

    // Intentially no setTokenName() and setTokenSymbol()
    function setTokenUri(uint256 _id, string calldata _uri) external {
        uriImpl[_id] = _uri;
    }

    // We don't check for circularities, it is a responsibility of the contract owner.
    // At worst, this produces out-of-gas errors.
    // See also README.
    function setTokenParent(uint256 _child, uint256 _parent) external {
        require(owner == msg.sender);

        parentToken[_child] = _parent;
    }

// Internal

    // It does not matter that this function is inefficient:
    // It is called either from an external view or once per tokens tree change.
    function _balanceOf(address _owner, uint256 _id) internal view returns (uint256 _balance) {
        // TODO: userTokensObjects[_childAddr] accessed twice.
        _balance = balances[_id][_owner];
        for (bytes32 _childAddr = userTokens[_owner][_id];
             _childAddr != 0;
             _childAddr = userTokensObjects[_childAddr].next)
        {
            uint256 _childId = userTokensObjects[_childAddr].token;
            _balance += _balanceOf(_owner, _childId); // recursion
        }
    }

    function _updateUserTokens(address _to, uint256 _id, uint256 _value) internal {
        uint256 _oldToBalance = balances[_id][_to];

        balances[_id][_to] = _value.add(_oldToBalance);

        if(_oldToBalance != 0) return;

        uint256 _parent = parentToken[_id];

        // User received a new token:
        if(_parent != 0) {
            // Insert into the beginning of the double linked list:
            UserToken memory _userToken = UserToken({token: _id, next: userTokens[_to][_parent]});
            bytes32 _userTokenAddr = keccak256(abi.encodePacked(_to, _parent, _id));
            userTokensObjects[_userTokenAddr] = _userToken;
            userTokens[_to][_parent] = _userTokenAddr;
        }
    }

    function _doMint(address _to, uint256 _id, uint256 _value) internal {
        // TODO: Limit the _value from above.

        _updateUserTokens(_to, _id, _value);
        totalSupplyImpl[_id] += _value; // TODO: Should decrease on transfer to 0x0?
    }

    // Returns how much have been transferred
    function _doTransferFrom(address _from, address _to, uint256 _id, uint256 _value) internal
        returns (uint256 _transferred, bool _remained)
    {
        // if(_value == 0) return 0; // TODO: inefficient without this

        uint256 _oldBalance = balances[_id][_from];

        bytes32 _childAddr = userTokens[_from][_id];

        if(_oldBalance >= _value) {
            balances[_id][_from] -= _value;
            _updateUserTokens(_to, _id, _value);
            return (_value, _oldBalance != _value || _childAddr != 0);
        }

        balances[_id][_from] = 0;
        _updateUserTokens(_to, _id, _oldBalance);

        uint256 _remainingValue = _value - _oldBalance;
        bytes32 _prevAddr = 0;
        while(_childAddr != 0 && _remainingValue != 0) {
            UserToken storage _childToken = userTokensObjects[_childAddr];

            (uint256 _childTransferred, bool _childRemained) =
                _doTransferFrom(_from, _to, _childToken.token, _remainingValue); // recursion
            _remainingValue -= _childTransferred;

            if(!_childRemained) {
                // Remove from user's list
                if(_prevAddr != 0) {
                    userTokensObjects[_prevAddr].next = _childToken.next;
                } else {
                    userTokens[_from][_id] = _childToken.next;
                }
            }

            _prevAddr = _childAddr;
            _childAddr = _childToken.next;
        }
        // return (_value - _remainingValue, _remainingValue != 0);
        return (_value - _remainingValue, _childAddr != 0);
    }

// Events

    event NewToken(uint256 id, string name, string symbol, string uri);
}
