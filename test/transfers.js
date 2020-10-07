const { expect } = require("chai");
// const bre = require("@nomiclabs/buidler");

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    const [ owner ] = await ethers.getSigners();

    const SumOfTokens = await ethers.getContractFactory("SumOfTokens");
    const sumOfTokens = await SumOfTokens.deploy(await owner.getAddress());

    await sumOfTokens.deployed();

    const createTokenEventAbi = [ "event NewToken(uint256 id, string name, string symbol, string uri)" ];
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    async function createToken(...args) {
      const tx = await sumOfTokens.newToken(...args);
      const coder = new ethers.utils.AbiCoder();
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const id = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      return id;
    }
    
    // TODO: More complex tokens tree.
    let tokens = [];
    let tree = {};
    const rootToken = await createToken("M+C Token", "M+C", "https://example.com");
    tokens.push(rootToken);
    for(let i = 0; i < 4; ++i) {
      const token = await createToken(`SubToken${i}`, `S${i}`, `https://example.com/${i}`);
      tokens.push(token);
      await sumOfTokens.connect(owner).setTokenParent(token, rootToken);
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
      wallets.push(ethers.Wallet.createRandom());
    }

    for(let iteration = 0; iteration < 1000; ++iteration) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = ethers.utils.parseEther(Math.random() * 1000.0);
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
