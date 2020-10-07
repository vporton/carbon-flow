//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

interface IERC1155Operators {
    event OperatorApproval(address indexed owner, address indexed operator, uint256 indexed id, bool approved);
    event ApprovalForAll(address indexed owner, address indexed operator, bool _approved);

    function setApproval(address _operator, uint256[] calldata _ids, bool _approved) external;
    function isApproved(address _owner, address _operator, uint256 _id)  external view returns (bool);
    function setApprovalForAll(address _operator, bool _approved) external;
    function isApprovedForAll(address _owner, address _operator) external view returns (bool isOperator);
}
