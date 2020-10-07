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

    console.log(`Checking minting and transferring...`); 

    for(let iteration = 0; iteration < 1000; ++iteration) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = ethers.utils.parseEther(String(Math.random() * 1000.0));
      if(Math.random() >= 0.5) {
        // Mint
        const to = wallets[Math.floor(Math.random() * wallets.length)];
        let oldToBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          oldToBalances.push(ethers.BigNumber.from(result));
        }
        await execAndWait(sumOfTokens.connect(owner), sumOfTokens.mint, to.address, token, amount, []);
        const newToBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          newToBalances.push(ethers.BigNumber.from(result));
        }
        for(let i = 0; i < newToBalances.length; ++i) {
          const change = newToBalances[i].sub(oldToBalances[i]);
          expect(change).to.equal(amount);
        }
      } else {
        // Transfer
        const fromIndex = Math.floor(Math.random() * wallets.length);
        const toIndex = Math.floor(Math.random() * wallets.length);
        const from = wallets[fromIndex];
        const to = wallets[toIndex];
        let oldFromBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(from.address, t);
          oldFromBalances.push(ethers.BigNumber.from(result));
        }
        let oldToBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          oldToBalances.push(ethers.BigNumber.from(result));
        }
        if(oldFromBalances[0] >= amount) {
          await execAndWait(sumOfTokens.connect(from), sumOfTokens.safeTransferFrom, from.address, to.address, token, amount, []);

          let newFromBalances = [];
          for(let t = token; typeof t != 'undefined'; t = tree[t]) {
            const result = await sumOfTokens.balanceOf(from.address, t);
            newFromBalances.push(ethers.BigNumber.from(result));
          }
          const newToBalances = [];
          for(let t = token; typeof t != 'undefined'; t = tree[t]) {
            const result = await sumOfTokens.balanceOf(to.address, t);
            newToBalances.push(ethers.BigNumber.from(result));
          }
          for(let i = 0; i < newToBalances.length; ++i) {
            const change = newToBalances[i].sub(oldToBalances[i]); // TODO: Check from balances, too
            expect(change).to.equal(amount);
          }
        } else {
          // TODO: test throw
        }
      }
    }

    // TODO: Test transfer of zero tokens.
    // TODO: Test batch mints and transfers.
    // TODO: Test totalSupply.
  });
});
