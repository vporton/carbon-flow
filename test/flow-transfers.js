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

describe("TokensFlow", function() {
  it("Checks correct transfers", async function() {
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("TokensFlowTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = [ "event NewToken(uint256 id, address owner, string name, string symbol, string uri)" ];
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    let wallets = [];
    for(let i = 0; i < 10; ++i) {
      const wallet0 = ethers.Wallet.createRandom();
      const wallet = wallet0.connect(ethers.provider);
      const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);
      wallets.push(wallet);
    }

    // TODO: More complex tokens tree.
    let tokens = []; // correspond to a first few wallets
    let tree = {};

    const tx = await tokensFlow.connect(wallets[0]).newToken(0, true, "M+C Token", "M+C", "https://example.com");
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const rootToken = createTokenEventIface.parseLog(receipt.logs[0]).args.id;

    tokens.push(rootToken);
    for(let i = 0; i < 4; ++i) {
      const tx = await tokensFlow.connect(wallets[i+1]).newToken(rootToken, true, `SubToken${i}`, `S${i}`, `https://example.com/${i}`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
      const tx2 = await tokensFlow.connect(wallets[0]).setTokenFlow(token, ethers.utils.parseEther('10000'), ethers.utils.parseEther('10000'), 10);
      await ethers.provider.getTransactionReceipt(tx2.hash);
      tree[token] = rootToken;
    }

    console.log(`Checking minting and transferring...`); 

    async function skipTime() { // move 10 sec forward in time
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(10).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    for(let iteration = 0; iteration < 1000; ++iteration) {
      // console.log('iteration', iteration);
      switch(random.int(0, 2)) {
        case 0: {
          // Mint
          const tokenIndex = random.int(0, tokens.length - 1);
          const token = tokens[tokenIndex];
          const amount = random.int(0, 10) == 0
            ? ethers.BigNumber.from('0')
            : ethers.utils.parseEther(random.float(0, 1000.0).toFixed(15)); // toFixed necessary ot to overflow digits number
          const to = wallets[random.int(0, wallets.length -1)];
          const oldToBalance = await tokensFlow.balanceOf(to.address, token);
          const oldTotal = await tokensFlow.totalSupply(token);
          // console.log("Mint");
          await tokensFlow.connect(wallets[tokenIndex]).mint(to.address, token, amount, [], {gasLimit: 1000000});
          await ethers.provider.getTransactionReceipt(tx.hash);
          const newToBalance = await tokensFlow.balanceOf(to.address, token);
          const newTotal = await tokensFlow.totalSupply(token);
          {
            const change = newToBalance.sub(oldToBalance);
            expect(change).to.equal(amount);
          }
          {
            const change = newTotal.sub(oldTotal);
            expect(change).to.equal(amount);
          }
          break;
        }
        case 1: {
          // Transfer
          const tokenIndex = random.int(0, tokens.length - 1);
          const token = tokens[tokenIndex];
          const fromIndex = random.int(0, wallets.length - 1);
          const toIndex = random.int(0, wallets.length - 1);
          const from = wallets[fromIndex];
          const to = wallets[toIndex];
          const oldFromBalance = await tokensFlow.balanceOf(from.address, token);
          const oldToBalance = await tokensFlow.balanceOf(to.address, token);
          const oldTotal = await tokensFlow.totalSupply(token);
          const amount = random.int(0, 10) == 0
            ? ethers.BigNumber.from('0')
            : random.bool()
            ? oldFromBalance
            : ethers.utils.parseEther(random.float(0, 1000.0).toFixed(15)); // toFixed necessary ot to overflow digits number
          if(oldFromBalance.gte(amount)) {
            // console.log("Transfer");
            const tx = await tokensFlow.connect(from).safeTransferFrom(from.address, to.address, token, amount, [], {gasLimit: 1000000});
            await ethers.provider.getTransactionReceipt(tx.hash);
      
            const newFromBalance = await tokensFlow.balanceOf(from.address, token);
            const newToBalance = await tokensFlow.balanceOf(to.address, token);
            const newTotal = await tokensFlow.totalSupply(token);
            {
              const change = oldFromBalance.sub(newFromBalance);
              expect(change).to.equal(from.address != to.address ? amount : ethers.BigNumber.from(0));
            }
            {
              const change = newToBalance.sub(oldToBalance);
              expect(change).to.equal(from.address != to.address ? amount : ethers.BigNumber.from(0));
            }
            expect(newTotal).to.equal(oldTotal);
          } else {
            async function mycall() {
              await tokensFlow.connect(from).safeTransferFrom(from.address, to.address, token, amount, [], {gasLimit: 1000000});
            }
            expect(mycall()).to.eventually.be.rejected; 
          }
          break;
        }
        case 2: {
          // Exchange
          const fromTokenIndex = random.int(1, tokens.length - 1);
          const fromToken = tokens[fromTokenIndex];
          const toToken = tokens[0];
          const wallet = wallets[random.int(0, wallets.length - 1)];
          const oldFromBalance = await tokensFlow.balanceOf(wallet.address, fromToken);
          const oldFromTotal = await tokensFlow.totalSupply(fromToken);
          const oldToBalance = await tokensFlow.balanceOf(wallet.address, toToken);
          const oldToTotal = await tokensFlow.totalSupply(toToken);
          const amount = random.int(0, 10) == 0
            ? ethers.BigNumber.from('0')
            : random.bool()
            ? oldFromBalance
            : ethers.utils.parseEther(random.float(0, 1000.0).toFixed(15)); // toFixed necessary ot to overflow digits number
          await skipTime();
          if(oldFromBalance.gte(amount)) {
            await tokensFlow.connect(wallet).exchangeToParent(fromToken, amount, [], {gasLimit: 1000000});
            await ethers.provider.getTransactionReceipt(tx.hash);
            const newFromBalance = await tokensFlow.balanceOf(wallet.address, fromToken);
            const newFromTotal = await tokensFlow.totalSupply(fromToken);
            const newToBalance = await tokensFlow.balanceOf(wallet.address, toToken);
            const newToTotal = await tokensFlow.totalSupply(toToken);
            {
              const change = newToBalance.sub(oldToBalance);
              expect(change).to.equal(amount);
            }
            {
              const change = newToTotal.sub(oldToTotal);
              expect(change).to.equal(amount);
            }
            {
              const change = oldFromBalance.sub(newFromBalance);
              expect(change).to.equal(amount);
            }
            {
              const change = oldFromTotal.sub(newFromTotal);
              expect(change).to.equal(amount);
            }
          } else {
            async function mycall() {
              await tokensFlow.connect(wallet).exchangeToParent(fromToken, amount, [], {gasLimit: 1000000});
            }
            await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
          }
          break;
        }
      }
    }

    // TODO: Test batch mints and transfers.
  });
});
