"strict";

const chai = require("chai");
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
const random = require('random');
const seedrandom = require('seedrandom');

chai.use(chaiAsPromised);

// random.use(seedrandom('rftg'));

// const bre = require("@nomiclabs/buidler");
function range(size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}

describe("SumOfTokens", function() {
  it("Checks correct transfers", async function() {
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

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
      const tx = await sumOfTokens.connect(owner).setTokenParent(token, rootToken);
      await ethers.provider.getTransactionReceipt(tx.hash);
      tree[token] = rootToken;
    }

    let wallets = [];
    for(let i = 0; i < 10; ++i) {
      const wallet0 = ethers.Wallet.createRandom();
      const wallet = wallet0.connect(ethers.provider);
      const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);
      wallets.push(wallet);
    }

    console.log(`Checking minting and transferring...`); 

    for(let iteration = 0; iteration < 1000; ++iteration) {
      // console.log('iteration', iteration);
      const token = tokens[random.int(0, tokens.length - 1)];
      const amount = ethers.utils.parseEther(random.float(0, 1000.0).toFixed(15)); // toFixed necessary ot to overflow digits number
      if(random.bool()) {
        // Mint
        const to = wallets[random.int(0, wallets.length -1)];
        let oldToBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          oldToBalances.push(result);
        }
        // console.log("Mint");
        await execAndWait(sumOfTokens.connect(owner), sumOfTokens.mint, to.address, token, amount, [], {gasLimit: 1000000});
        const newToBalances = [];
        for(let t = token; typeof t != 'undefined'; t = tree[t]) {
          const result = await sumOfTokens.balanceOf(to.address, t);
          newToBalances.push(result);
        }
        for(let i = 0; i < newToBalances.length; ++i) {
          const change = newToBalances[i].sub(oldToBalances[i]);
          expect(change).to.equal(amount);
        }
      } else {
        // Transfer
        const fromIndex = random.int(0, wallets.length -1);
        const toIndex = random.int(0, wallets.length -1);
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
          oldToBalances.push(result);
        }
        if(oldFromBalances[0].gte(amount)) {
          // console.log("Transfer");
          const tx = await sumOfTokens.connect(from).safeTransferFrom(from.address, to.address, token, amount, [], {gasLimit: 1000000});
          await ethers.provider.getTransactionReceipt(tx.hash);
    
          let newFromBalances = [];
          for(let t = token; typeof t != 'undefined'; t = tree[t]) {
            const result = await sumOfTokens.balanceOf(from.address, t);
            newFromBalances.push(result);
          }
          const newToBalances = [];
          for(let t = token; typeof t != 'undefined'; t = tree[t]) {
            const result = await sumOfTokens.balanceOf(to.address, t);
            newToBalances.push(result);
          }
          for(let i = 0; i < newFromBalances.length; ++i) {
            const change = oldFromBalances[i].sub(newFromBalances[i]);
            expect(change).to.equal(from.address != to.address ? amount : ethers.BigNumber.from(0));
          }
          for(let i = 0; i < newToBalances.length; ++i) {
            const change = newToBalances[i].sub(oldToBalances[i]);
            expect(change).to.equal(from.address != to.address ? amount : ethers.BigNumber.from(0));
          }
        } else {
          async function mycall() {
            await sumOfTokens.connect(from).safeTransferFrom(from.address, to.address, token, amount, [], {gasLimit: 1000000});
          }
          expect(mycall()).to.eventually.be.rejected; 
        }
      }
    }

    // TODO: Test transfer of zero tokens, test transfer entire account balance.
    // TODO: Test batch mints and transfers.
    // TODO: Test totalSupply.
  });
});
