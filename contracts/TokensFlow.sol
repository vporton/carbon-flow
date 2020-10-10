//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import '@nomiclabs/buidler/console.sol';

import "./ERC1155.sol";
import "./IERC1155Views.sol";

contract TokensFlow is ERC1155, IERC1155Views
{
    using SafeMath for uint256;
    using Address for address;

    // TODO: rename variables
    struct TokenFlow {
        uint256 parentToken;
        uint256 maxSwapCredit;
        uint swapCreditPeriod;
        uint timeEnteredSwapCredit; // zero means not in a swap credit
        uint lastSwapTime; // ignored when not in a swap credit
        uint256 remainingSwapCredit;
    }

    uint256 public maxTokenId;

    mapping (uint256 => address) public tokenOwners;
    mapping (uint256 => bool) public mintingAllowed; // TODO: setter for this?

    mapping (uint256 => TokenFlow) public tokenFlow;

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

    function newToken(uint256 _parent, bool _mintingAllowed,
                      string calldata _name, string calldata _symbol, string calldata _uri)
        external returns (uint256)
    {
        return _newToken(_parent, _mintingAllowed, _name, _symbol, _uri);
    }

    // Intentially no setTokenName() and setTokenSymbol()
    function setTokenUri(uint256 _id, string calldata _uri) external {
        uriImpl[_id] = _uri;
    }

    // We don't check for circularities.
    function setTokenParent(uint256 _child, uint256 _parent) external {
        // require(_child <= maxTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        _setTokenParent(_child, _parent);
    }

    function setTokenFlow(uint256 _child, uint256 _maxSwapCredit, uint256 _remainingSwapCredit, uint _swapCreditPeriod) external {
        TokenFlow storage _flow = tokenFlow[_child];

        require(msg.sender == tokenOwners[_flow.parentToken]);
        require(_remainingSwapCredit <= _maxSwapCredit); // TODO: We could do well enough without this check...

        _flow.maxSwapCredit = _maxSwapCredit;
        _flow.swapCreditPeriod = _swapCreditPeriod;
        _flow.timeEnteredSwapCredit = _currentTime(); // TODO: Allow to set an arbitrary timestamp here.
        _flow.remainingSwapCredit = _remainingSwapCredit;
    }

    function mint(address _to, uint256 _id, uint256 _value, bytes calldata _data) external {
        require(tokenOwners[_id] == msg.sender);
        // require(_id != 0);
        require(mintingAllowed[_id]);

        _doMint(_to, _id, _value, _data);
    }

// Flow

    // TODO: Several exchanges in one call.
    function exchangeToParent(uint256 _id, uint256 _amount, bytes calldata _data) external {
        // Intentionally no check for `msg.sender`.
        TokenFlow storage _flow = tokenFlow[_id];
        uint256 _maxAllowedFlow = _maxSwapAmount(_flow);
        require(_amount <= _maxAllowedFlow);
        uint256 _balance = balances[_id][msg.sender];
        require(_amount <= _balance);
        _doBurn(msg.sender, _id, _amount);
        _doMint(msg.sender, _flow.parentToken, _amount, _data);
        if(!_inSwapCredit(_flow)) { // TODO: called second time here (TODO: Use `pure` in the interface?)
            _flow.timeEnteredSwapCredit = _currentTime();
            _flow.remainingSwapCredit = _flow.maxSwapCredit;
        }
        _flow.lastSwapTime = _currentTime();
        _flow.remainingSwapCredit -= _amount; // no need for overflow checking
    }

// Internal

    // Keep in sync with _newToken2
    function _newToken(uint256 _parent, bool _mintingAllowed,
                       string calldata _name, string calldata _symbol, string calldata _uri)
        internal returns (uint256)
    {
        tokenOwners[++maxTokenId] = msg.sender;
        mintingAllowed[maxTokenId] = _mintingAllowed;

        nameImpl[maxTokenId] = _name;
        symbolImpl[maxTokenId] = _symbol;
        uriImpl[maxTokenId] = _uri;

        _setTokenParent(maxTokenId, _parent);

        emit NewToken(maxTokenId, msg.sender, _name, _symbol, _uri);

        return maxTokenId;
    }

    // Keep in sync with _newToken
    function _newToken2(uint256 _parent, bool _mintingAllowed,
                       string memory _name, string memory _symbol, string memory _uri)
        internal returns (uint256)
    {
        tokenOwners[++maxTokenId] = msg.sender;
        mintingAllowed[maxTokenId] = _mintingAllowed;

        nameImpl[maxTokenId] = _name;
        symbolImpl[maxTokenId] = _symbol;
        uriImpl[maxTokenId] = _uri;

        _setTokenParent(maxTokenId, _parent);

        emit NewToken(maxTokenId, msg.sender, _name, _symbol, _uri);

        return maxTokenId;
    }

    function _doMint(address _to, uint256 _id, uint256 _value, bytes memory _data) public {
        require(_to != address(0), "_to must be non-zero.");

        if(_value != 0) {
            totalSupplyImpl[_id] = _value.add(totalSupplyImpl[_id]); // TODO: Should increase on transfer to 0x0?
            balances[_id][_to] += _value; // no need to check for overflow due to the previous line
        }

        // MUST emit event
        emit TransferSingle(msg.sender, address(0), _to, _id, _value);

        // Now that the balance is updated and the event was emitted,
        // call onERC1155Received if the destination is a contract.
        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(msg.sender, address(0), _to, _id, _value, _data);
        }
    }

    function _doBurn(address _from, uint256 _id, uint256 _value) public {
        // require(_from != address(0), "_from must be non-zero.");

        balances[_id][_from] = balances[_id][_from].sub(_value);
        totalSupplyImpl[_id] -= _value; // no need to check for overflow due to the previous line // TODO: Should decrease on transfer to 0x0?

        // MUST emit event
        emit TransferSingle(msg.sender, _from, address(0), _id, _value);
    }

    // Also resets swap credits, so use with caution.
    function _setTokenParent(uint256 _child, uint256 _parent) internal {
        // require(_parent <= maxTokenId); // against an unwise child

        tokenFlow[_child] = TokenFlow({parentToken: _parent,
                                       maxSwapCredit: 0,
                                       swapCreditPeriod: 0,
                                       timeEnteredSwapCredit: 0, // zero means not in a swap credit
                                       lastSwapTime: 0,
                                       remainingSwapCredit: 0});
    }

    function _currentTime() internal virtual view returns(uint256) {
        return block.timestamp;
    }

    // TODO: additional arguments to the below functions to optimize them

    function _inSwapCredit(TokenFlow memory _flow) public view returns(bool) {
        // console.log(_flow.timeEnteredSwapCredit, _currentTime(), _flow.timeEnteredSwapCredit, _flow.swapCreditPeriod);
        return _flow.timeEnteredSwapCredit != 0 &&
               int256(_currentTime()) - int256(_flow.timeEnteredSwapCredit) < int256(_flow.swapCreditPeriod);
    }

    // TODO: external
    function _maxSwapAmount(TokenFlow memory _flow) public view returns(uint256) {
        if(_inSwapCredit(_flow)) {
            // TODO: Will it use less gas if store data in int256?
            int256 passedTime = int256(_currentTime()) - int256(_flow.lastSwapTime);
            int256 delta = passedTime * int256(_flow.maxSwapCredit) / int256(_flow.swapCreditPeriod);
            int256 result = int256(_flow.remainingSwapCredit) - delta;
            console.log(result < 0 ? 0 : uint256(result));
            return result < 0 ? 0 : uint256(result); // TODO: slow
        } else {
            console.log(_flow.maxSwapCredit);
            return _flow.maxSwapCredit;
        }
    }

// Events

    event NewToken(uint256 id, address owner, string name, string symbol, string uri);
}
