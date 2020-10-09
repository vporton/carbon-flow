//SPDX-License-Identifier: GPL-3.0-or-later
// A simple smart wallet to be used for testing.
// Based on code from https://github.com/argentlabs/argent-contracts/blob/develop/contracts/wallet/BaseWallet.sol
pragma solidity ^0.7.1;

contract TestSmartWallet
{
    address payable owner;

    constructor(address payable _owner) payable {
        owner = _owner;
    }

    modifier ownerOnly {
        require(msg.sender == owner, "You are not the owner of the smart wallet");
        _;
    }

    /**
     * @notice Performs a generic transaction.
     * @param _target The address for the transaction.
     * @param _value The value of the transaction.
     * @param _data The data of the transaction.
     */
    function invoke(address _target, uint _value, bytes calldata _data) external ownerOnly returns (bytes memory _result) {
        require (msg.sender == owner);

        (bool success, bytes memory result) = _target.call{value: _value}(_data);

        require (success, string (result));
        return result;
        // emit Invoked(msg.sender, _target, _value, _data);
    }

    receive() external payable {
    }
}
