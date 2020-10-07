"strict";

const { expect } = require("chai");

// const bre = require("@nomiclabs/buidler");
function range(size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    this.timeout(60*1000);

    const [ owner ] = await ethers.getSigners();

    const SumOfTokens = await ethers.getContractFactory("SumOfTokens");
    const sumOfTokens = await SumOfTokens.deploy(await owner.getAddress());

    await sumOfTokens.deployed();

    const createTokenEventAbi = [ "event NewToken(uint256 id, string name, string symbol, string uri)" ];
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    async function execAndWait(contract, method, ...args) {
      const tx = await method.bind(contract)(...args);
      return await ethers.provider.getTransactionReceipt(tx.hash);
    }

    async function createToken(...args) {
      const receipt = await execAndWait(sumOfTokens, sumOfTokens.newToken, ...args);
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

    let wallets = [];
    for(let i = 0; i < 10; ++i) {
      wallets.push(ethers.Wallet.createRandom());
    }

    console.log(`Checking minting...`); 

    for(let iteration = 0; iteration < 1000; ++iteration) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = ethers.utils.parseEther(String(Math.random() * 1000.0));
      if(Math.random() >= 0.5) {
        const to = wallets[Math.floor(Math.random() * wallets.length)];
        let oldBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          oldBalances.push(ethers.BigNumber.from(result));
        }
        await execAndWait(sumOfTokens, sumOfTokens.mint, to.address, token, amount, []);
        const newBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          newBalances.push(ethers.BigNumber.from(result));
        }
        for(let i = 0; i < newBalances.length; ++i) {
          const change = newBalances[i].sub(oldBalances[i]);
          expect(change).to.equal(amount);
        }
      }
    }

    // TODO: Test transfer of zero tokens.
    // TODO: Test totalSupply.
  });
});
