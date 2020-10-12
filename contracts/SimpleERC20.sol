//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;

import "./IERC20.sol";

contract SimpleERC20 is IERC20 {
    string public symbol;
    string public name;
    uint8 public decimals;
    uint256 public override totalSupply;
    
    // Owner of this contract
    address public owner;
 
    // Balances for each account
    mapping(address => uint256) private balances;
 
    // Owner of account approves the transfer of an amount to another account
    mapping(address => mapping (address => uint256)) private allowed;
 
    // Functions with this modifier can only be executed by the owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
 
    // Constructor
    constructor(string memory _symbol, string memory _name, uint8 _decimals, uint256 _initialBalance) public {
        owner = msg.sender;
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        balances[owner] = _initialBalance;
        totalSupply = _initialBalance;
    }

    // What is the balance of a particular account?
    function balanceOf(address _owner) external view override returns (uint256 balance) {
        return balances[_owner];
    }
 
    // Transfer the balance from owner's account to another account
    function transfer(address _to, uint256 _amount) external override returns (bool success) {
        if (balances[msg.sender] >= _amount && balances[_to] + _amount > balances[_to]) {
            balances[msg.sender] -= _amount;
            balances[_to] += _amount;
            Transfer(msg.sender, _to, _amount);
            return true;
        } else {
            return false;
        }
    }
 
    // Send _value amount of tokens from address _from to address _to
    // The transferFrom method is used for a withdraw workflow, allowing contracts to send
    // tokens on your behalf, for example to "deposit" to a contract address and/or to charge
    // fees in sub-currencies; the command should fail unless the _from account has
    // deliberately authorized the sender of the message via some mechanism; we propose
    // these standardized APIs for approval:
    function transferFrom(address _from, address _to, uint256 _amount) external override returns (bool success) {
        // solhint-disable bracket-align
        if (balances[_from] >= _amount
            && allowed[_from][msg.sender] >= _amount
            && balances[_to] + _amount > balances[_to])
        {
            balances[_from] -= _amount;
            allowed[_from][msg.sender] -= _amount;
            balances[_to] += _amount;
            Transfer(_from, _to, _amount);
            return true;
        } else {
            return false;
        }
        // solhint-enable bracket-align
    }
 
    // Allow _spender to withdraw from your account, multiple times, up to the _value amount.
    // If this function is called again it overwrites the current allowance with _value.
    function approve(address _spender, uint256 _amount) external override returns (bool success) {
        allowed[msg.sender][_spender] = _amount;
        Approval(msg.sender, _spender, _amount);
        return true;
    }
 
    function allowance(address _owner, address _spender) external view override returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
}