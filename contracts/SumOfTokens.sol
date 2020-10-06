//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./ERC1155.sol";

// A sample implementation of core ERC1155 function.
contract SumOfToken is ERC1155
{
    mapping (uint256 => uint256) parentToken;
    mapping (uint256 => uint256[]) childTokens;

    // token => updated
    mapping (uint256 => bool) tokenBalancesUpdated; // FIXME: negate?

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
        uint256[] storage _childs = childTokens[_id];
        uint _childsLength = _childs.length;
        uint256 _balance = 0;
        for(uint i = 0; i < _childsLength; ++i) {
            _balance += _balanceOf(_owner, _childs[i]); // recursion
        }
        return _balance;
    }

    function _recalculateBalanceOf(address _owner, uint256 _id) internal returns (uint256) {
        if(!tokenBalancesUpdated[_id]) {
            uint256[] storage _childs = childTokens[_id];
            uint _childsLength = _childs.length;
            uint256 _balance = 0;
            for(uint i = 0; i < _childsLength; ++i) {
                _balance += _recalculateBalanceOf(_owner, _childs[i]); // recursion
            }
            balances[_id][_owner] = _balance;
            tokenBalancesUpdated[_id] = true;
            return _balance;
        }
        return balances[_id][_owner];
    }
}
