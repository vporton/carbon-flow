const { expect } = require("chai");

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    const SumOfTokens = await ethers.getContractFactory("SumOfTokens");
    const sumOfTokens = await SumOfTokens.deploy();

    await sumOfTokens.deployed();

    // console.log(await sumOfTokens.newToken());
    // return;

    // TODO: More complex tokens tree.
    let tokens = [];
    let tree = {};
    const rootToken = await sumOfTokens.newToken()  //.value;
    console.log(rootToken)
    tokens.push(rootToken);
    console.log((await sumOfTokens.tokenOwners(rootToken)));
    for(let i = 0; i < 4; ++i) {
      const token = (await sumOfTokens.newToken()).value;
      tokens.push(token);
      await sumOfTokens.setTokenParent(token, rootToken);
      tree[token] = rootToken;
    }

    async function verifyBalances(address) {
      let balances = [];
      for(let i = 0; i < tokens.length; ++i) {
        balances[i] = await sumOfTokens.balanceOf(address);
      }
      let balances2 = [];
      for(let i = 0; i < tokens.length; ++i)
        balances2.push(0);
      for(let i = 0; i < tokens.length; ++i) {
          if(tokens[i] in tree) {
          if(tree[tokens[i]] in balances2)
            balances2[tree[tokens[i]]] += balances[i];
          else
            balances2[tree[tokens[i]]] = balances[i];
        }
      }
      expect(balances2).to.deep.equal(balances);
    }

    let wallets = [];
    for(let i = 0; i < 10; ++i) {
      wallets.push(Wallet.createRandom());
    }

    for(let iteration = 0; iteration < 1000; ++iteration) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = utils.parseEther(Math.random() * 1000.0);
      if(Math.random() >= 0.5) {
        const oldBalance = await sumOfTokens.balanceOf(to.address);
        const to = wallets[Math.floor(Math.random() * wallets.length)];
        await sumOfTokens.mint(to.address, token, amount, []);
        const newBalance = await sumOfTokens.balanceOf(to.address);
        expect(newBalance - oldBalance).to.equal(amount);
        await verifyBalances(to.address);
      }
    }

    // TODO: Test transfer of zero tokens.

    // expect(await greeter.greet()).to.equal("Hello, world!");
  });
});
