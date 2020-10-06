//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./ERC1155.sol";

contract SumOfToken is ERC1155
{
    using SafeMath for uint256;
    using Address for address;

    // double linked list
    struct UserToken {
        uint256 token;
        bytes32 prev;
        bytes32 next;
    }

    mapping (uint256 => uint256) parentToken;

    // token => !updated
    mapping (uint256 => bool) tokenBalancesNotUpdated;

    // user => (parent => obj)
    mapping (address => mapping (uint256 => bytes32)) userTokens;

    mapping (bytes32 => UserToken) public userTokensObjects;

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
        require(_id != 0);

        require(_to != address(0x0), "_to must be non-zero.");
        require(_from == msg.sender || operatorApproval[_from][msg.sender] == true, "Need operator approval for 3rd party transfers.");

        _doTransferFrom(_from, _to, _id, _value);

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
        require(_to != address(0x0), "destination address must be non-zero.");
        require(_ids.length == _values.length, "_ids and _values array length must match.");
        require(_from == msg.sender || operatorApproval[_from][msg.sender] == true, "Need operator approval for 3rd party transfers.");

        for (uint256 i = 0; i < _ids.length; ++i) {
            uint256 _id = _ids[i];
            require(_id != 0);
            uint256 _value = _values[i];

            _doTransferFrom(_from, _to, _id, _value);
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

    // It does not matter that this function is inefficient:
    // It is called either from an external view or once per tokens tree change.
    function _balanceOf(address _owner, uint256 _id) internal view returns (uint256) {
        uint256 _balance = 0;
        for (bytes32 _childAddr = userTokens[_owner][_id];
             _childAddr != 0;
             _childAddr = userTokensObjects[_childAddr].next)
        {
            uint256 _childId = userTokensObjects[_childAddr].token;
            _balance += _balanceOf(_owner, _childId); // recursion
        }
        return _balance;
    }

    function _recalculateBalanceOf(address _owner, uint256 _id) internal returns (uint256) {
        require(_id != 0);

        if(tokenBalancesNotUpdated[_id]) {
            uint256 _balance = 0;
            for (bytes32 _childAddr = userTokens[_owner][_id];
                _childAddr != 0;
                _childAddr = userTokensObjects[_childAddr].next)
            {
                uint256 _childId = userTokensObjects[_childAddr].token;
                _balance += _recalculateBalanceOf(_owner, _childId); // recursion
            }
            balances[_id][_owner] = _balance;
            tokenBalancesNotUpdated[_id] = false;
            return _balance;
        }
        return balances[_id][_owner];
    }

    function _updateUserTokens(address _to, uint256 _id, uint256 _value) internal {
        uint256 _oldToBalance = balances[_id][_to];
        if(!tokenBalancesNotUpdated[_id]) {
            balances[_id][_to] = _value.add(_oldToBalance);
        }

        uint256 _parent = parentToken[_id];

        // User received a new token:
        if(_oldToBalance == 0) {
            // Insert into the beginning of the double linked list:
            UserToken memory _userToken = UserToken({token: _id, prev: 0, next: userTokens[_to][_parent]});
            bytes32 _userTokenAddr = keccak256(abi.encodePacked(_to, _id));
            userTokensObjects[_userTokenAddr] = _userToken;
            userTokens[_to][_parent] = _userTokenAddr;
        }
    }

    function _doMint(address _to, uint256 _id, uint256 _value) internal {
        // FIXME: check owner
        // TODO: limit the sum

        if(_value != 0) {
            _doMintParents(_to, _id, _value);
            _doMintChilds(_to, _id, _value);
        }
    }

    // Must be called after _recalculateBalanceOf().
    function _doMintChilds(address _to, uint256 _id, uint256 _value) internal {
        uint256 _childId = _id;
        for(;;) {
            bytes32 _tokenAddr = userTokens[_to][_childId]; // defined for the first loop iteration because parents were already processed
            bytes32 _childAddr = userTokensObjects[_tokenAddr].next; // FIXME: does it exist?
             if(_childAddr == 0) break;
             _childId = userTokensObjects[_childAddr].token;
            _updateUserTokens(_to, _childId, _value);
        }
    }

    // Must be called after _recalculateBalanceOf().
    function _doMintParents(address _to, uint256 _id, uint256 _value) internal {
        assert(_value != 0);

        uint256 _next = _id;
        do {
            _updateUserTokens(_to, _next, _value);
            _next = parentToken[_next];
        } while(_next != 0);
    }

    function _doTransferFrom(address _from, address _to, uint256 _id, uint256 _value) internal {
        require(_recalculateBalanceOf(_from, _id) >= _value);

        if(_value != 0) {
            _doTransferFromParents(_from, _to, _id, _value);
            _doTransferFromChilds(_from, _to, _id, _value);
        }
    }

    // Must be called after _recalculateBalanceOf().
    function _doTransferFromChilds(address _from, address _to, uint256 _id, uint256 _value) internal {
        uint256 _remainingValue = _value;

        for (bytes32 _childAddr = userTokens[_from][_id];
             _childAddr != 0;
             _childAddr = userTokensObjects[_childAddr].next)
        {
            uint256 _childId = userTokensObjects[_childAddr].token; // defined for the first loop iteration because parents were already processed

            uint256 _oldBalance = balances[_childId][_from]; // balance was already recalculated.

            if(_oldBalance >= _remainingValue) {
                balances[_childId][_from] -= _remainingValue;
                _updateUserTokens(_to, _childId, _remainingValue);
                break;
            } else if(_remainingValue != 0) {
                UserToken storage _childToken = userTokensObjects[_childAddr];

                bytes32 _nextTokenAddr = _childToken.next;
                require(_nextTokenAddr != 0);

                balances[_childId][_from] = 0;
                _updateUserTokens(_to, _childId, _remainingValue);
                
                UserToken storage _nextToken = userTokensObjects[_nextTokenAddr];

                // Remove from user's list
                if(_nextTokenAddr != 0) {
                    _nextToken.prev = _childToken.prev;
                }
                if(_childToken.prev != 0) {
                    userTokensObjects[_childToken.prev].next = _nextTokenAddr;
                }

                _doTransferFromChilds(_from, _to, _childId, _remainingValue); // recursion
            }
        
            _remainingValue -= _oldBalance;
        }
    }

    // Must be called after _recalculateBalanceOf().
    function _doTransferFromParents(address _from, address _to, uint256 _id, uint256 _value) internal {
        assert(_value != 0);

        uint256 _next = _id;
        do {
            balances[_id][_from] -= _value;
            _updateUserTokens(_to, _next, _value);
            _next = parentToken[_next];
        } while(_next != 0);
    }

    // TODO: metadata

// Administrativia

    function setTokenParent(uint256 _child, uint256 _parent) external {
        uint256 _ancestor = _child;
        // if(_ancestor == parent) return; // TODO
        for(;;) {
            _ancestor = parentToken[_child];
            if(_ancestor == 0) break;
            tokenBalancesNotUpdated[_ancestor] = true;
        }
        
        parentToken[_child] = _parent;
        _ancestor = _parent;
        for(;;) {
            require(_ancestor != _child); // no loops
            tokenBalancesNotUpdated[_ancestor] = true;
            _ancestor = parentToken[_child];
            if(_ancestor == 0) break;
        }
    }
}
