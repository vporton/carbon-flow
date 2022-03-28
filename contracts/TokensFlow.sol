//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import 'hardhat/console.sol';
import "./ERC1155.sol";
import "./IERC1155Views.sol";
import "./ABDKMath64x64.sol";

contract TokensFlow is ERC1155 /*, IERC1155Views*/ {
    using SafeMath for uint256;
    using ABDKMath64x64 for int128;
    using Address for address;

    // See also _createSwapLimit()
    struct SwapLimit {
        bool recurring;
        int256 initialSwapCredit;
        int256 maxSwapCredit;
        int swapCreditPeriod;
        int firstTimeEnteredSwapCredit;
        bytes32 hash;
    }

    struct TokenFlow {
        int128 coefficient;
        SwapLimit limit;
        int256 remainingSwapCredit;
        int timeEnteredSwapCredit; // zero means not in a swap credit
        int lastSwapTime; // ignored when not in a swap credit
        bool enabled;
    }

    uint256 public nextTokenId;

    mapping (uint256 => mapping (uint256 => bool)) public parentTokens; // child => (parent => true)
    mapping (uint256 => mapping (uint256 => TokenFlow)) public tokenFlow; // child => (parent => flow)

    mapping (uint256 => address) public tokenOwners;

    mapping (uint256 => uint256) private totalSupplyImpl;
    mapping (uint256 => string) private uriImpl;

    function totalSupply(uint256 _id) external view returns (uint256) {
        return totalSupplyImpl[_id];
    }

    function uri(uint256 _id) external view returns (string memory) {
        return uriImpl[_id];
    }

// Administrativia

    // Disallowed for carbon token because it would increase `nextToken` by 1 and we need by 2.
    // function newToken(uint256 _parent, string calldata _uri)
    //     external returns (uint256)
    // {
    //     return _newToken(_parent, _uri, msg.sender);
    // }

    function setTokenOwner(uint256 _id, address _newOwner) external {
        require(msg.sender == tokenOwners[_id]);
        require(_newOwner != address(0)); // against human errors
        // require(_id != 0); // not needed

        tokenOwners[_id] = _newOwner;
    }

    function removeTokenOwner(uint256 _id) external {
        require(msg.sender == tokenOwners[_id]);

        tokenOwners[_id] = address(0);
    }

    // Intentially no setTokenName() and setTokenSymbol()
    function setTokenUri(uint256 _id, string calldata _uri) external {
        require(msg.sender == tokenOwners[_id]);

        uriImpl[_id] = _uri;
    }

    // We don't check for circularities.
    function setTokenParent(uint256 _child, uint256 _parent, bool _value) external {
        // require(_child != 0 && _child < nextTokenId); // not needed
        require(msg.sender == tokenOwners[_child]);

        _setTokenParentNoCheck(_child, _parent, _value);
    }

    // Each element of `_childs` list must be a child of the next one.
    // TODO: Test. Especially test the case if the last child has no parent. Also test if a child is zero.
    function setEnabled(uint256[] calldata _childs, bool _enabled) external {
        uint256 _ancestor = _childs[_childs.length - 1];
        require(msg.sender == tokenOwners[_ancestor]);
        
        for (uint i = 0; i != _childs.length - 1; ++i) {
            uint256 _id = _childs[i];
            require(_id != _ancestor); // Prevent (irreversibly) enabling ourselves using a cycle.
            if (i != _childs.length - 1) {
                uint256 _parent = _childs[i + 1];
                require(parentTokens[_id][_parent]); // FIXME: This check isn't enough: childs control parents.
                tokenFlow[_id][_parent].enabled = _enabled;
            }
        }
    }

    // User can set negative values. It is a nonsense but does not harm.
    function setRecurringFlow(
        uint256 _child,
        uint256 _parent,
        int128 _coefficient,
        int256 _maxSwapCredit,
        int256 _remainingSwapCredit,
        int _swapCreditPeriod, int _timeEnteredSwapCredit,
        bytes32 oldLimitHash) external
    {
        require(msg.sender == tokenOwners[_parent]);
        TokenFlow storage _flow = tokenFlow[_child][_parent];
        require(_flow.limit.hash == oldLimitHash);
        // require(_remainingSwapCredit <= _maxSwapCredit); // It is caller's responsibility.

        _flow.coefficient = _coefficient;
        _flow.limit = _createSwapLimit(true, _remainingSwapCredit, _maxSwapCredit, _swapCreditPeriod, _timeEnteredSwapCredit);
        _flow.timeEnteredSwapCredit = _timeEnteredSwapCredit;
        _flow.remainingSwapCredit = _remainingSwapCredit;
    }

    // User can set negative values. It is a nonsense but does not harm.
    function setNonRecurringFlow(uint256 _child, uint256 _parent, int128 _coefficient, int256 _remainingSwapCredit, bytes32 oldLimitHash) external {
        require(msg.sender == tokenOwners[_parent]);
        // require(_remainingSwapCredit <= _maxSwapCredit); // It is caller's responsibility.
        // require(tokenParents[_child][_parent]); // not needed
        TokenFlow storage _flow = tokenFlow[_child][_parent];
        require(_flow.limit.hash == oldLimitHash);

        _flow.coefficient = _coefficient;
        _flow.limit = _createSwapLimit(false, _remainingSwapCredit, 0, 0, 0);
        _flow.remainingSwapCredit = _remainingSwapCredit;
    }

// ERC-1155

    // A token can anyway change its parent at any moment, so disabling of payments makes no sense.

    // function safeTransferFrom(
    //     address _from,
    //     address _to,
    //     uint256 _id,
    //     uint256 _value,
    //     bytes calldata _data) external virtual override
    // {
    //     require(tokenFlow[_id].enabled);
    //     super._safeTransferFrom(_from, _to, _id, _value, _data);
    // }

    // function safeBatchTransferFrom(
    //     address _from,
    //     address _to,
    //     uint256[] calldata _ids,
    //     uint256[] calldata _values,
    //     bytes calldata _data) external virtual override
    // {
    //     for (uint i = 0; i < _ids.length; ++i) {
    //         require(tokenFlow[_ids[i]].enabled);
    //     }
    //     super._safeBatchTransferFrom(_from, _to, _ids, _values, _data);
    // }

// Misc

    function burn(address _from, uint256 _id, uint256 _value) external {
        require(_from == msg.sender || operatorApproval[msg.sender][_from], "No approval.");

        // SafeMath will throw with insuficient funds _from
        // or if _id is not valid (balance will be 0)
        balances[_id][_from] = balances[_id][_from].sub(_value);
        totalSupplyImpl[_id] -= _value; // no need to check overflow due to previous line

        emit TransferSingle(msg.sender, _from, address(0), _id, _value);
    }

// Flow

    // Each next token ID must be a parent of the previous one.
    function exchangeToAncestor(uint256[] calldata _ids, uint256 _amount, bytes calldata _data) external {
        // Intentionally no check for `msg.sender`.
        require(_ids[_ids.length - 1] != 0); // The rest elements are checked below.
        require(_amount < 1<<128);
        uint256 _balance = balances[_ids[0]][msg.sender];
        require(_amount <= _balance);
        TokenFlow storage _flow;
        uint256 _newAmount = _amount;
        for(uint i = 0; i != _ids.length - 1; ++i) {
            uint256 _id = _ids[i];
            uint256 _parent = _ids[i + 1];
            require(parentTokens[_id][_parent]);
            // require(_id != 0 && _parent != 0); // not needed
            _flow = tokenFlow[_id][_parent];
            require(_flow.enabled);
            int _currentTimeResult = _currentTime();
            uint256 _maxAllowedFlow;
            bool _inSwapCreditResult;
            if (_flow.limit.recurring) {
                _inSwapCreditResult = _inSwapCredit(_flow, _currentTimeResult);
                _maxAllowedFlow = _maxRecurringSwapAmount(_flow, _currentTimeResult, _inSwapCreditResult);
            } else {
                _maxAllowedFlow = _flow.remainingSwapCredit < 0 ? 0 : uint256(_flow.remainingSwapCredit);
            }
            require(_amount <= _maxAllowedFlow);
            if (_flow.limit.recurring && !_inSwapCreditResult) {
                _flow.timeEnteredSwapCredit = _currentTimeResult;
                _flow.remainingSwapCredit = _flow.limit.maxSwapCredit;
            }
            _flow.lastSwapTime = _currentTimeResult; // TODO: not strictly necessary if !_flow.recurring
            // require(_amount < 1<<128); // done above
            _flow.remainingSwapCredit -= int256(_amount);
            _newAmount = _flow.coefficient.mulu(_newAmount);
        }

        // if (_id == _flow.parentToken) return; // not necessary
        _doBurn(msg.sender, _ids[0], _amount);
        _doMint(msg.sender, _ids[_ids.length - 1], _newAmount, _data);
    }

    // Each next token ID must be a parent of the previous one.
    // Removed to prevent higher authorities to meddle with our tokens. (One can just make a higher authority his parent instead.)
    // function exchangeToDescendant(uint256[] calldata _ids, uint256 _amount, bytes calldata _data) external {
    //     uint256 _parent = _ids[0];
    //     require(_parent != 0);
    //     uint256 _newAmount = _amount;
    //     for(uint i = 1; i != _ids.length; ++i) {
    //         _parent = tokenFlow[_parent].parentToken;
    //         require(_parent != 0);
    //         require(_parent == _ids[i]); // consequently `_ids[i] != 0`
    //         _newAmount = _newAmount.mul(_parent.coefficient);
    //     }
    //     _doBurn(msg.sender, _ids[_ids.length - 1], _newAmount);
    //     _doMint(msg.sender, _ids[0], _amount, _data); 
    // }

// Internal

    function _newToken(string memory _uri, address _owner) internal returns (uint256) {
        tokenOwners[nextTokenId] = _owner;

        uriImpl[nextTokenId] = _uri;

        emit NewToken(nextTokenId, _owner, _uri);

        return nextTokenId++;
    }

    function _doMint(address _to, uint256 _id, uint256 _value, bytes memory _data) public {
        require(_to != address(0), "_to must be non-zero.");

        if (_value != 0) {
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

    function _setTokenParentNoCheck(uint256 _child, uint256 _parent, bool _value) internal virtual {
        require(_parent < nextTokenId);

        parentTokens[_child][_parent] = _value;
    }

    function _currentTime() internal virtual view returns(int) {
        return int(block.timestamp);
    }

    function _inSwapCredit(TokenFlow memory _flow, int _currentTimeResult) public pure returns(bool) {
        // solhint-disable indent
        return _flow.timeEnteredSwapCredit != 0 &&
            _currentTimeResult - _flow.timeEnteredSwapCredit < _flow.limit.swapCreditPeriod;
    }

    function _maxRecurringSwapAmount(TokenFlow memory _flow, int _currentTimeResult, bool _inSwapCreditResult)
        public pure returns(uint256)
    {
        int256 result;
        if (_inSwapCreditResult) {
            int256 passedTime = _currentTimeResult - _flow.lastSwapTime;
            int256 delta = _flow.limit.maxSwapCredit * passedTime / _flow.limit.swapCreditPeriod;
            result = _flow.remainingSwapCredit - delta;
        } else {
            result = _flow.limit.maxSwapCredit;
        }
        return result < 0 ? 0 : uint256(result);
    }

    function _createSwapLimit(
        bool _recurring,
        int256 _initialSwapCredit,
        int256 _maxSwapCredit,
        int _swapCreditPeriod,
        int _firstTimeEnteredSwapCredit) pure internal returns (SwapLimit memory)
    {
        return SwapLimit({
            recurring: _recurring,
            initialSwapCredit: _initialSwapCredit,
            maxSwapCredit: _maxSwapCredit,
            swapCreditPeriod: _swapCreditPeriod,
            firstTimeEnteredSwapCredit: _firstTimeEnteredSwapCredit,
            hash: keccak256(abi.encodePacked(_recurring, _initialSwapCredit, _maxSwapCredit, _swapCreditPeriod, _firstTimeEnteredSwapCredit))
        });
    }

// Events

    event NewToken(uint256 indexed id, address indexed owner, string uri);
}
