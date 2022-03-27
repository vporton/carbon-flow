const { deployments } = require("hardhat");
const mainTest = require('../lib/main-test.js');;

const chai = require("chai");

async function main() {
    await mainTest(chai, deployments, 10000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
