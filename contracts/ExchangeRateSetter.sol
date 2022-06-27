//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

// import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";
import { TokensFlow } from "./TokensFlow.sol";

interface AggregatorV3Interface {
  function decimals() external view returns (uint8);
  function description() external view returns (string memory);
  function version() external view returns (uint256);
  function getRoundData(uint80 _roundId)
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}

/// Not `Ownable` - `setOwner` is directed directly to carbon contract.
contract ExchangeRateSetter is /*Ownable,*/ TransparentUpgradeableProxy {
    TokensFlow tokenContract;
    mapping (uint256 => mapping (uint256 => AggregatorV3Interface)) aggregators; // child => (parent => aggregator)
    
    constructor(TokensFlow _tokenContract, address _admin, bytes memory _data)
        TransparentUpgradeableProxy(address(_tokenContract), _admin, _data)
    {
        tokenContract = _tokenContract;
    }

    function setAggregator(uint256 _child, uint256 _parent, AggregatorV3Interface _aggregator) public {
        require(msg.sender == tokenContract.tokenOwners(_parent));
        aggregators[_child][_parent] = _aggregator;
        emit SetAggregator(_child, _parent, _aggregator);
    }

    /// Publicly accessible
    function updateFromAggregator(uint256 _child, uint256 _parent) public {
        AggregatorV3Interface _aggregator = aggregators[_child][_parent];
        (
            uint80 _roundId,
            int256 _answer,
            uint256 _startedAt,
            uint256 _updatedAt,
            uint80 _answeredInRound
        ) = _aggregator.latestRoundData();
 
        tokenContract.setCoefficient(_child, _parent, int128(_answer));
    }

    event SetAggregator(uint256 child, uint256 parent, AggregatorV3Interface aggregator);
}