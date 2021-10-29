//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "./TokensFlow.sol";
import "./ABDKMath64x64.sol";

// TODO: We need multiple competing community funds.
//       Problem: If a local fund (or even a commercial accounter) has too cheap retirement, it's bad for the global community.
//       We can make retired tokens just another kind of fund and retiring be just transfer with tax (energy-efficient?)
//       We need also multiplier in swaps: Consider if some carbon accounter was found a thief, we need to dive his tokens after transferring ownership away.

contract BaseCarbon is TokensFlow {
    using SafeMath for uint256;
    using ABDKMath64x64 for int128;

    mapping (uint256 => int128) public taxes; // 2**64 is 100%

// Admin

    // solhint-disable func-visibility
    // solhint-disable bracket-align
    constructor() { }
    // solhint-enable bracket-align
    // solhint-enable func-visibility

    // TODO: Allow several non-retired token have one retired?
    function setTax(uint256 _nonRetiredToken, int128 _tax) external isNonRetiredToken(_nonRetiredToken) {
        require(msg.sender == tokenOwners[_nonRetiredToken]);
        require(_tax >= 0 && _tax <= 1<<64); // 0-100%
        taxes[_nonRetiredToken] = _tax;
    }

    // function setMainTokens(uint256 _retiredCreditsToken, uint256 _nonRetiredCreditsToken) external { // needed?
    //     require(msg.sender == globalCommunityFund);
    //     require(_retiredCreditsToken != 0 && _nonRetiredCreditsToken != 0);
    //     retiredCreditsToken = _retiredCreditsToken;
    //     nonRetiredCreditsToken = _nonRetiredCreditsToken;
    // }

// Credits

    // WARNING: If the caller of this function is a contract, it must implement ERC1155TokenReceiver interface.
    function retireCredit(uint256 _nonRetiredToken, uint _amount) external isNonRetiredToken(_nonRetiredToken) {
        _doBurn(msg.sender, _nonRetiredToken, _amount);
        uint256 _taxAmount = uint256(taxes[_nonRetiredToken].mulu(_amount));
        bytes memory _data = ""; // efficient?
        uint256 _retiredTokenId = _retiredToken(_nonRetiredToken);
        // TODO: Multiply by a coefficient?
        _doMint(tokenOwners[_retiredTokenId], _retiredTokenId, _taxAmount, _data);
        _doMint(msg.sender, _retiredTokenId, _amount - _taxAmount, _data);
        // emit CreditRetired(creditId); // not needed as _doBurn() emits a suitable event
    }

// Internal

    function _retiredToken(uint256 _nonRetiredToken) internal pure isNonRetiredToken(_nonRetiredToken) returns(uint256) {
        return _nonRetiredToken + 1;
    }

    // See also `createAuthority()`.
    modifier isNonRetiredToken(uint256 _nonRetiredToken) {
        require(_nonRetiredToken % 2 == 0);
        _;
    }
}
