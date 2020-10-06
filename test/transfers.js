const { expect } = require("chai");

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    const SumOfTokens = await ethers.getContractFactory("SumOfTokens");
    const sumOfTokens = await SumOfTokens.deploy();

    await sumOfTokens.deployed();

    // TODO: More complex tokens tree.
    let tokens = [];
    const rootToken = (await sumOfTokens.newToken()).value;
    tokens.push(rootToken);
    for(let i = 0; i < 4; ++i) {
      const token = (await sumOfTokens.newToken()).value;
      tokens.push(token);
      await sumOfTokens.setTokenParent(token, rootToken);
    }

    // expect(await greeter.greet()).to.equal("Hello, world!");
  });
});
