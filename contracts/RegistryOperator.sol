//SPDX-License-Identifier: Apache-2.0	
pragma solidity ^0.7.1;
pragma experimental ABIEncoderV2;

import './Carbon.sol';

contract RegistryOperator
{
    Carbon carbonRegistry;

    constructor(Carbon _carbonRegistry) {
        carbonRegistry = _carbonRegistry;
    }
}
