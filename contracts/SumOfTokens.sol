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
        bytes32 prev;
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
        require(_id != 0, "non-existing token.");

        require(_to != address(0), "_to must be non-zero.");
        require(_from == msg.sender || _allowance(_id, _from, msg.sender) >= _value, "Not appoved to transfer");

        if(_value != 0) {
            if(_from == _to) {
                require(_balanceOf(_from, _id) >= _value);
            } else {
                (uint256 _transferred,) = _doTransferFrom(_from, _to, _id, _value);
                require(_transferred == _value);
            }
        }

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
            require(_id != 0, "non-existing token.");
            uint256 _value = _values[i];

            if(_value != 0) {
                if(_from == _to) {
                    require(_balanceOf(_from, _id) >= _value);
                } else {
                    (uint256 _transferred,) = _doTransferFrom(_from, _to, _id, _value);
                    require(_transferred == _value);
                }
            }
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
            uint256 _childBalance = _balanceOf(_owner, _childId); // recursion
            assert(_childBalance != 0); // We don't keep zero-value tokens in the linked list.
            _balance += _childBalance;
        }
    }

    function _userTokenAddress(address _user, uint256 _parent, uint256 _id) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(_user, _parent, _id));
    }

    function _updateUserTokens(address _to, uint256 _id, uint256 _value) internal {
        assert(_value != 0);

        uint256 _oldToBalance = balances[_id][_to];

        balances[_id][_to] = _value.add(_oldToBalance);

        if(_oldToBalance != 0) return; // Token already present in the list.

        uint256 _parent = parentToken[_id];

        // User received a new token:
        if(_parent != 0) {
            // Insert into the beginning of the double linked list:
            bytes32 _nextAddr = userTokens[_to][_parent];
            UserToken memory _userToken = UserToken({token: _id, next: _nextAddr, prev: 0});
            bytes32 _userTokenAddr = _userTokenAddress(_to, _parent, _id);
            userTokensObjects[_userTokenAddr] = _userToken;
            if(_nextAddr != 0) {
                userTokensObjects[_nextAddr].prev = _userTokenAddr;
            }
            userTokens[_to][_parent] = _userTokenAddr;
        }
    }

    function _doMint(address _to, uint256 _id, uint256 _value, bytes calldata _data) public {
        // TODO: Limit the _value from above.

        require(_to != address(0), "_to must be non-zero.");

        if(_value != 0) {
            _updateUserTokens(_to, _id, _value);
            do {
                totalSupplyImpl[_id] += _value; // TODO: Should decrease on transfer to 0x0?
                _id = parentToken[_id];
            } while(_id != 0);
        }

        // MUST emit event
        emit TransferSingle(msg.sender, address(0), _to, _id, _value);

        // Now that the balance is updated and the event was emitted,
        // call onERC1155Received if the destination is a contract.
        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(msg.sender, address(0), _to, _id, _value, _data);
        }
    }

    // Returns how much have been transferred
    function _doTransferFrom(address _from, address _to, uint256 _id, uint256 _value) internal
        returns (uint256 _transferred, bool _remained)
    {
        assert(_value != 0 && _from != _to);

        uint256 _oldBalance = balances[_id][_from];

        bytes32 _childAddr = userTokens[_from][_id];

        uint256 _remainingValue; // how much not succeeded to transfer (TODO: better explanation)
        if(_oldBalance >= _value) {
            balances[_id][_from] -= _value;
            _updateUserTokens(_to, _id, _value);
            _transferred = _value;
            _remainingValue = 0;
            _remained = _oldBalance != _value;
        } else {
            balances[_id][_from] = 0;
            if(_oldBalance != 0) {
                _updateUserTokens(_to, _id, _oldBalance);
            }

            _remainingValue = _value - _oldBalance;
            bytes32 _prevAddr = 0;
            _remained = false;
            while(_childAddr != 0 && _remainingValue != 0) {
                UserToken storage _childToken = userTokensObjects[_childAddr];

                (uint256 _childTransferred, bool _childRemained) = _doTransferFrom(_from, _to, _childToken.token, _remainingValue); // recursion
                if(_childRemained) {
                    _remained = true;
                }
                _remainingValue -= _childTransferred;

                _prevAddr = _childAddr;
                _childAddr = _childToken.next;
            }
        }
        if(!_remained) {
            // Remove from user's list
            uint256 _parent = parentToken[_id];
            if(_parent != 0) {
                bytes32 _ourAddr = _userTokenAddress(_from, _parent, _id);
                UserToken storage _token = userTokensObjects[_ourAddr];
                if(_token.prev != 0) {
                    userTokensObjects[_token.prev].next = _token.next;
                } else {
                    userTokens[_from][_parent] = _token.next;
                }
                if(_token.next != 0) {
                    userTokensObjects[_token.next].prev = _token.prev;
                }
            }
        } else {
            assert(_balanceOf(_from, _id) != 0); // FIXME: slow
        }

        _transferred = _value - _remainingValue;
    }

// Events

    event NewToken(uint256 id, string name, string symbol, string uri);
}
