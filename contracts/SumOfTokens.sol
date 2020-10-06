//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./ERC1155.sol";

// A sample implementation of core ERC1155 function.
contract SumOfToken is ERC1155
{
    using SafeMath for uint256;

    // linked list
    struct ChildToken {
        uint256 token;
        bytes32 next;
    }

    // double linked list
    struct UserToken {
        uint256 token;
        uint256 amount;
        bytes32 prev;
        bytes32 next;
    }

    mapping (uint256 => uint256) parentToken;
    mapping (uint256 => bytes32) childTokens;
    mapping (bytes32 => ChildToken) public childTokenObjects;

    // token => updated
    mapping (uint256 => bool) tokenBalancesUpdated; // FIXME: negate?

    // user => (parent => (child => obj))
    mapping (address => mapping (uint256 => mapping (uint256 => bytes32))) userTokens;

    mapping (bytes32 => UserToken) public userTokensObjects;

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

    // It does not matter that this function is inefficient:
    // It is called either from an external view or once per tokens tree change.
    function _balanceOf(address _owner, uint256 _id) internal view returns (uint256) {
        uint256 _balance = 0;
        for(bytes32 _iter = childTokens[_id]; _iter != 0; _iter = childTokenObjects[_iter].next) {
            _balance += _balanceOf(_owner, childTokenObjects[_iter].token); // recursion
        }
        return _balance;
    }

    function _recalculateBalanceOf(address _owner, uint256 _id) internal returns (uint256) {
        if(!tokenBalancesUpdated[_id]) {
            uint256 _balance = 0;
            for(bytes32 _iter = childTokens[_id]; _iter != 0; _iter = childTokenObjects[_iter].next) {
                _balance += _recalculateBalanceOf(_owner, childTokenObjects[_iter].token); // recursion
            }
            balances[_id][_owner] = _balance;
            tokenBalancesUpdated[_id] = true;
            return _balance;
        }
        return balances[_id][_owner];
    }

    // FIXME
    function _doTransferFrom(address _from, address _to, uint256 _id, uint256 _value) internal {
        uint256 _oldBalance = _recalculateBalanceOf(_from, _id);
        uint256 _parentToken = parentToken[_id];
        bytes32 _userTokenAddr = userTokens[_from][_parentToken][_id];
        require(_userTokenAddr != 0);
        UserToken storage _userToken = userTokensObjects[_userTokenAddr];
        if(_oldBalance <= _value) {
            _oldBalance -= _value;
        } else {
            bytes32 _nextTokenAddr = _userToken.next;
            require(_nextTokenAddr != 0);

            // TODO: Join these two variables into one?
            balances[_id][_from] = 0;
            userTokens[_from][_parentToken][_id] = 0;
            
            // Remove from user's list
            if(_userToken.prev != 0) userTokensObjects[_userToken.prev].next = _userToken.next;
            if(_userToken.next != 0) userTokensObjects[_userToken.next].prev = _userToken.prev;

            uint256 _nextToken = userTokensObjects[_nextTokenAddr].token;
            _doTransferFrom(_from, _to, _nextToken, _value - _oldBalance); // TODO: Use a loop instead.
        }
        balances[_id][_to] = _value.add(balances[_id][_to]);
    }
}
