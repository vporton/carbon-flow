//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

/**
    Note: Simple contract to use as base for const vals
*/
contract CommonConstants {
    // solhint-disable-next-line max-line-length
    bytes4 constant internal ERC1155_ACCEPTED = 0xf23a6e61; // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))

    // solhint-disable-next-line max-line-length
    bytes4 constant internal ERC1155_BATCH_ACCEPTED = 0xbc197c81; // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
}
