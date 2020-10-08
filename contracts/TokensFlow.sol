//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

// import '@nomiclabs/buidler/console.sol';

import "./ERC1155.sol";
import "./IERC1155Views.sol";

contract SumOfTokens is ERC1155, IERC1155Views
{
    using SafeMath for uint256;
    using Address for address;

    struct TokenFlow {
        uint256 parentToken;
        uint lastExchangeTime;
        uint256 maxExchangePerSecond;
        // uint256 maxCreditsPerSecond; // TODO
    }

    uint256 public maxTokenId;

    mapping (uint256 => address) public tokenOwners;

    mapping (uint256 => TokenFlow) tokenFlow;

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

    // We don't check for circularities.
    // FIXME: Does it break flow info?
    // function setTokenParent(uint256 _child, uint256 _parent) external {
    //     require(msg.sender == tokenOwners[_parent]);

    //     parentToken[_child] = _parent;
    // }

// Flow

    // TODO: Several exchanges in one call.
    function exchangeToParent(uint256 _id) external {
        // Intentionally no check for `msg.sender`.
        TokenFlow storage _flow = tokenFlow[_id];
        uint256 _maxAllowedFlow = (block.timestamp - _flow.lastExchangeTime) * _flow.maxExchangePerSecond;
        uint256 _balance = balances[_id][msg.sender];
        uint256 _value = _balance > _maxAllowedFlow ? _maxAllowedFlow : _balance;
        _doBurn(msg.sender, _id, _value, "");
        _doMint(msg.sender, _flow.parentToken, _value, "");
        _flow.lastExchangeTime = block.timestamp;
    }

// Internal

    function _doMint(address _to, uint256 _id, uint256 _value, bytes calldata _data) public {
        require(_to != address(0), "_to must be non-zero.");

        // FIXME: Check overflow.
        totalSupplyImpl[_id] += _value; // TODO: Should increase on transfer to 0x0?

        // MUST emit event
        emit TransferSingle(msg.sender, address(0), _to, _id, _value);

        // Now that the balance is updated and the event was emitted,
        // call onERC1155Received if the destination is a contract.
        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(msg.sender, address(0), _to, _id, _value, _data);
        }
    }

    function _doBurn(address _from, uint256 _id, uint256 _value, bytes calldata _data) public {
        // require(_from != address(0), "_from must be non-zero.");

        totalSupplyImpl[_id] = totalSupplyImpl[_id].sub(_value); // TODO: Should increase on transfer to 0x0?

        // MUST emit event
        emit TransferSingle(msg.sender, _from, address(0), _id, _value);
    }

// Events

    event NewToken(uint256 id, string name, string symbol, string uri);
}
