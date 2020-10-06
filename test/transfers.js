const { expect } = require("chai");

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    const SumOfTokens = await ethers.getContractFactory("SumOfTokens");
    const sumOfTokens = await SumOfTokens.deploy();

    await sumOfTokens.deployed();
    // expect(await greeter.greet()).to.equal("Hello, world!");
  });
});
