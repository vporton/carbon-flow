//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./IERC1155.sol";
import "./IERC1155Views.sol";
import "./IERC20.sol";

interface IMyERC1155 is IERC1155, IERC1155Views { }

// TODO: Test it.
// This contract has a bug: It does not emit ERC-20 events.
contract ERC20OverERC1155 is IERC20
{
    IMyERC1155 erc1155;
    uint256 tokenId;

    constructor(IMyERC1155 _erc1155, uint256 _tokenId) {
        erc1155 = _erc1155;
        tokenId = _tokenId;
    }

    function totalSupply() external override view returns (uint256) {
        return erc1155.totalSupply(tokenId);
    }

    function balanceOf(address account) external override view returns (uint256) {
        erc1155.balanceOf(account, tokenId);
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        try erc1155.safeTransferFrom(msg.sender, recipient, tokenId, amount, "") {
            return true;
        }
        catch Error(string memory /*reason*/) {
            return false;
        }
    }

    function allowance(address owner, address spender) external override view returns (uint256) {
        return erc1155.allowance(tokenId, owner, spender);
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        uint256 _currentValue = erc1155.allowance(tokenId, msg.sender, spender); // insecure hack, cannot be made better
        erc1155.approve(spender, tokenId, _currentValue, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        try erc1155.safeTransferFrom(sender, recipient, tokenId, amount, "") {
            return true;
        }
        catch Error(string memory /*reason*/) {
            return false;
        }
    }
}
