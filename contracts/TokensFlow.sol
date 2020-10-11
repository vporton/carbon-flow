//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import '@nomiclabs/buidler/console.sol';
import "./ERC1155.sol";
import "./IERC1155Views.sol";

contract TokensFlow is ERC1155, IERC1155Views
{
    using SafeMath for uint256;
    using Address for address;

    struct TokenFlow {
        uint256 parentToken;
        int256 maxSwapCredit;
        int swapCreditPeriod;
        int timeEnteredSwapCredit; // zero means not in a swap credit
        int lastSwapTime; // ignored when not in a swap credit
        int256 remainingSwapCredit;
        bool enabled;
    }

    uint256 public maxTokenId;

    mapping (uint256 => address) public tokenOwners;

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

    function newToken(uint256 _parent,
                      string calldata _name, string calldata _symbol, string calldata _uri)
        external returns (uint256)
    {
        return _newToken(_parent, _name, _symbol, _uri, msg.sender);
    }

    // Intentially no setTokenName() and setTokenSymbol()
    function setTokenUri(uint256 _id, string calldata _uri) external {
        uriImpl[_id] = _uri;
    }

    // We don't check for circularities.
    function setTokenParent(uint256 _child, uint256 _parent) external {
        // require(_child != 0 && _child <= maxTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        _setTokenParentNoCheck(_child, _parent);
    }

    // TODO: Enable/disable multiple childs in one call.
    function setEnabled(uint256 _child, bool _enabled) external {
        bool _found = false;
        for(uint256 _id = tokenFlow[_child].parentToken; _id != 0; _id = tokenFlow[_id].parentToken) {
            require(_id != _child); // Prevent irrevocably disable itself, also save gas.
            if(!tokenFlow[_id].enabled) {
                break; // A disabled entity cannot enable/disable other entities.
            }
            if(msg.sender == tokenOwners[_id]) {
                _found = true;
                break;
            }
        }
        require(_found);

        tokenFlow[_child].enabled = _enabled;
    }

    // User can set negative values. It is a nonsense but does not harm.
    function setTokenFlow(uint256 _child, int256 _maxSwapCredit, int256 _remainingSwapCredit, int _swapCreditPeriod, int timeEnteredSwapCredit) external {
        TokenFlow storage _flow = tokenFlow[_child];

        require(msg.sender == tokenOwners[_flow.parentToken]);
        // require(_remainingSwapCredit <= _maxSwapCredit); // It is caller's responsibility.

        _flow.maxSwapCredit = _maxSwapCredit;
        _flow.swapCreditPeriod = _swapCreditPeriod;
        _flow.timeEnteredSwapCredit = timeEnteredSwapCredit;
        _flow.remainingSwapCredit = _remainingSwapCredit;
    }

// Flow

    // TODO: Several exchanges in one call.
    function exchangeToParent(uint256 _id, uint256 _amount, bytes calldata _data) external {
        // Intentionally no check for `msg.sender`.
        TokenFlow storage _flow = tokenFlow[_id];
        int _currentTimeResult = _currentTime();
        bool _inSwapCreditResult = _inSwapCredit(_flow, _currentTimeResult);
        uint256 _maxAllowedFlow = _maxSwapAmount(_flow, _currentTimeResult, _inSwapCreditResult);
        require(_amount <= _maxAllowedFlow);
        uint256 _balance = balances[_id][msg.sender];
        require(_amount <= _balance);
        _doBurn(msg.sender, _id, _amount);
        _doMint(msg.sender, _flow.parentToken, _amount, _data);
        if(!_inSwapCreditResult) {
            _flow.timeEnteredSwapCredit = _currentTimeResult;
            _flow.remainingSwapCredit = _flow.maxSwapCredit;
        }
        _flow.lastSwapTime = _currentTimeResult;
        require(_amount < 1<<128);
        _flow.remainingSwapCredit -= int256(_amount);
    }

// Internal

    function _newToken(uint256 _parent,
                        string memory _name, string memory _symbol, string memory _uri,
                        address _owner)
        internal returns (uint256)
    {
        tokenOwners[++maxTokenId] = _owner;

        nameImpl[maxTokenId] = _name;
        symbolImpl[maxTokenId] = _symbol;
        uriImpl[maxTokenId] = _uri;

        _setTokenParentNoCheck(maxTokenId, _parent);

        emit NewToken(maxTokenId, _owner, _name, _symbol, _uri);

        return maxTokenId;
    }

    function _doMint(address _to, uint256 _id, uint256 _value, bytes memory _data) public {
        require(_to != address(0), "_to must be non-zero.");

        if(_value != 0) {
            totalSupplyImpl[_id] = _value.add(totalSupplyImpl[_id]);
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
        totalSupplyImpl[_id] -= _value; // no need to check for overflow due to the previous line

        // MUST emit event
        emit TransferSingle(msg.sender, _from, address(0), _id, _value);
    }

    // Also resets swap credits and `enabled`, so use with caution.
    // Allow this even if `!enabled` and set `enabled` to `true` if no parent,
    // as otherwise impossible to enable it again.
    function _setTokenParentNoCheck(uint256 _child, uint256 _parent) virtual internal {
        require(_parent <= maxTokenId);

        tokenFlow[_child] = TokenFlow({parentToken: _parent,
                                       maxSwapCredit: 0,
                                       swapCreditPeriod: 0,
                                       timeEnteredSwapCredit: 0, // zero means not in a swap credit
                                       lastSwapTime: 0,
                                       remainingSwapCredit: 0,
                                       enabled: _parent == 0});
    }

    function _currentTime() internal virtual view returns(int) {
        return int(block.timestamp);
    }

    function _inSwapCredit(TokenFlow memory _flow, int _currentTimeResult) public pure returns(bool) {
        return _flow.timeEnteredSwapCredit != 0 &&
               _currentTimeResult - _flow.timeEnteredSwapCredit < _flow.swapCreditPeriod;
    }

    function _maxSwapAmount(TokenFlow memory _flow, int _currentTimeResult, bool _inSwapCreditResult) public pure returns(uint256) {
        int256 result;
        if(_inSwapCreditResult) {
            int256 passedTime = _currentTimeResult - _flow.lastSwapTime;
            int256 delta = _flow.maxSwapCredit * passedTime / _flow.swapCreditPeriod;
            result = _flow.remainingSwapCredit - delta;
        } else {
            result = _flow.maxSwapCredit;
        }
        return result < 0 ? 0 : uint256(result);
    }

// Events

    event NewToken(uint256 id, address owner, string name, string symbol, string uri);
}
