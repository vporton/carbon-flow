//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./IERC1155.sol";
import "./IERC1155Views.sol";
import "./ERC20.sol";

interface IMyERC1155 is IERC1155, IERC1155Views { }

// TODO: Test it.
contract ERC20LockedERC1155 is ERC20 {
    IMyERC1155 public erc1155;
    uint256 public tokenId;

    // solhint-disable func-visibility
    constructor(IMyERC1155 _erc1155, uint256 _tokenId)
    {
        erc1155 = _erc1155;
        tokenId = _tokenId;
    }
    // solhint-enable func-visibility

    function borrowERC1155(uint256 _amount, address _to) external {
        bytes memory _data = ""; // efficient?
        erc1155.safeTransferFrom(msg.sender, address(this), tokenId, _amount, _data);
        _mint(_to, _amount);
    }

    function returnToERC1155(uint256 _amount, address _to) external {
        bytes memory _data = ""; // efficient?
        erc1155.safeTransferFrom(address(this), _to, tokenId, _amount, _data);
        _burn(msg.sender, _amount);
    }

    function name() external view returns(string memory) {
        return erc1155.name(tokenId);
    }

    function symbol() external view returns(string memory) {
        return erc1155.symbol(tokenId);
    }
}
