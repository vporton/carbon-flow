//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./IERC1155.sol";
import "./IERC1155Views.sol";
import "./ERC20.sol";

interface IMyERC1155 is IERC1155, IERC1155Views { }

// TODO: Test it.
// FIXME: non-abstract
abstract contract ERC20LockedERC1155 is ERC20 {
    IMyERC1155 public erc1155;
    uint256 public tokenId;

    // solhint-disable func-visibility
    // FIXME: more args
    constructor(IMyERC1155 _erc1155, uint256 _tokenId) {
        erc1155 = _erc1155;
        tokenId = _tokenId;
    }
    // solhint-enable func-visibility
}
