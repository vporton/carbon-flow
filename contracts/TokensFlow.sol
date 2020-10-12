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
        bool recurring;
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

    function newToken(uint256 _parent, string calldata _name, string calldata _symbol, string calldata _uri)
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

    // Each element of `_childs` list must be a child of the next one.
    // TODO: Test.
    function setEnabled(uint256[] calldata _childs, bool _enabled) external {
        uint256 _firstChild = _childs[0]; // asserts on `_childs.length == 0`.
        uint256 _parent;
        bool _hasRight = false;
        for(uint256 i = 0; i != _childs.length; ++i) {
            uint256 _id = _childs[i];

            // Prevent irrevocably disable itself, also save gas.
            require(i == 0 || (_id != _firstChild && _id == _parent));

            _parent = tokenFlow[_id].parentToken;
            if(!tokenFlow[_parent].enabled) {
                break; // A disabled entity cannot enable/disable other entities.
            }
            if(msg.sender == tokenOwners[_parent]) {
                _hasRight = true;
            }

            tokenFlow[_id].enabled = _enabled;
        }
        require(_hasRight);
    }

    // User can set negative values. It is a nonsense but does not harm.
    function setRecurringFlow(
        uint256 _child,
        int256 _maxSwapCredit,
        int256 _remainingSwapCredit,
        int _swapCreditPeriod, int _timeEnteredSwapCredit) external
    {
        TokenFlow storage _flow = tokenFlow[_child];

        require(msg.sender == tokenOwners[_flow.parentToken]);
        // require(_remainingSwapCredit <= _maxSwapCredit); // It is caller's responsibility.

        _flow.maxSwapCredit = _maxSwapCredit;
        _flow.swapCreditPeriod = _swapCreditPeriod;
        _flow.timeEnteredSwapCredit = _timeEnteredSwapCredit;
        _flow.remainingSwapCredit = _remainingSwapCredit;
        _flow.recurring = true;
    }

    // User can set negative values. It is a nonsense but does not harm.
    function setNonRecurringFlow(uint256 _child, int256 _remainingSwapCredit) external {
        TokenFlow storage _flow = tokenFlow[_child];

        require(msg.sender == tokenOwners[_flow.parentToken]);
        // require(_remainingSwapCredit <= _maxSwapCredit); // It is caller's responsibility.

        _flow.remainingSwapCredit = _remainingSwapCredit;
        _flow.recurring = false;
    }

// ERC-1155

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data) external virtual override
    {
        require(tokenFlow[_id].enabled);
        super._safeTransferFrom(_from, _to, _id, _value, _data);
    }

    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data) external virtual override
    {
        for(uint i = 0; i < _ids.length; ++i) {
            require(tokenFlow[_ids[i]].enabled);
        }
        super._safeBatchTransferFrom(_from, _to, _ids, _values, _data);
    }


// Flow

    // TODO: Test for `_levels != 1`.
    function exchangeToParent(uint256 _id, uint256 _amount, uint _levels, bytes calldata _data) external {
        // Intentionally no check for `msg.sender`.
        if(_levels == 0) {
            return;
        }
        uint256 _currentId = _id;
        TokenFlow storage _flow;
        for(uint i = 0; i < _levels; ++i) {
            _flow = tokenFlow[_currentId];
            int _currentTimeResult = _currentTime();
            // TODO: no need to calculate _inSwapCreditResult if !_flow.recurring
            bool _inSwapCreditResult = _inSwapCredit(_flow, _currentTimeResult);
            uint256 _maxAllowedFlow = _maxSwapAmount(_flow, _currentTimeResult, _inSwapCreditResult);
            require(_amount <= _maxAllowedFlow);
            uint256 _balance = balances[_currentId][msg.sender];
            require(_amount <= _balance);
            if(_flow.recurring && !_inSwapCreditResult) {
                _flow.timeEnteredSwapCredit = _currentTimeResult;
                _flow.remainingSwapCredit = _flow.maxSwapCredit;
            }
            _flow.lastSwapTime = _currentTimeResult; // TODO: no strictly necessary if !_flow.recurring
            require(_amount < 1<<128);
            _flow.remainingSwapCredit -= int256(_amount);
            _currentId = tokenFlow[_currentId].parentToken;
        }
        // if(_id == _flow.parentToken) return; // not necessary
        _doBurn(msg.sender, _id, _amount);
        _doMint(msg.sender, _flow.parentToken, _amount, _data);
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

        tokenFlow[_child] = TokenFlow({
            parentToken: _parent,
            maxSwapCredit: 0,
            swapCreditPeriod: 0,
            timeEnteredSwapCredit: 0, // zero means not in a swap credit
            lastSwapTime: 0,
            remainingSwapCredit: 0,
            enabled: _parent == 0,
            recurring: false
        });
    }

    function _currentTime() internal virtual view returns(int) {
        return int(block.timestamp);
    }

    function _inSwapCredit(TokenFlow memory _flow, int _currentTimeResult) public pure returns(bool) {
        // solhint-disable indent
        return _flow.timeEnteredSwapCredit != 0 &&
            _currentTimeResult - _flow.timeEnteredSwapCredit < _flow.swapCreditPeriod;
    }

    function _maxSwapAmount(TokenFlow memory _flow, int _currentTimeResult, bool _inSwapCreditResult)
        public pure returns(uint256)
    {
        int256 result;
        if(!_flow.recurring) {
            result = _flow.remainingSwapCredit;
        } else if(_inSwapCreditResult) {
            int256 passedTime = _currentTimeResult - _flow.lastSwapTime;
            int256 delta = _flow.maxSwapCredit * passedTime / _flow.swapCreditPeriod;
            result = _flow.remainingSwapCredit - delta;
        } else {
            result = _flow.maxSwapCredit;
        }
        return result < 0 ? 0 : uint256(result);
    }

// Events

    event NewToken(uint256 indexed id, address indexed owner, string name, string symbol, string uri);
}
