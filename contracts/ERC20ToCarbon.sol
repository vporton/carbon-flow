//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import { Carbon } from "./Carbon.sol";
import { IERC20} from "./IERC20.sol";

contract ERC20ToTokenFlow {
    Carbon public erc1155Contract;

    uint256 public erc1155TokenId;

    IERC20 public erc20;

    // solhint-disable func-visibility
    constructor (string memory _nonRetiredUri, string memory _retiredUri, Carbon erc1155_, IERC20 erc20_) {
        erc1155Contract = erc1155_;
        erc1155TokenId = erc1155_.createAuthority(_nonRetiredUri, _retiredUri);        
        erc20 = erc20_;
    }
    // solhint-enable func-visibility

    function borrowERC20(uint256 _amount, address _from, address _to, bytes calldata _data) public {
        erc1155Contract.createCredit(erc1155TokenId, _amount, _to, "");
        require(erc20.transferFrom(_from, address(this), _amount), "Cannot transfer.");
        emit BorrowedERC20(msg.sender, _amount, _from, _to, _data);
    }

    function returnToERC20(uint256 _amount, address _to) public {
        erc1155Contract.burn(msg.sender, erc1155TokenId, _amount);
        require(erc20.transfer(_to, _amount), "Cannot transfer.");
        emit ReturnedToERC20(_amount, msg.sender, _to);
    }

    event BorrowedERC20(address sender, uint256 amount, address from, address to, bytes data);

    event ReturnedToERC20(uint256 amount, address from, address to);
}