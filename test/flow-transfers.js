"strict";

const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const { solidity } = require("ethereum-waffle");
const fs = require('fs');
const random = require('random');
const seedrandom = require('seedrandom');
const StupidWallet = require('../lib/stupid-wallet.js');
const LimitSetter = require('../lib/limit-setter.js');
const { createAuthority } = require('../lib/carbon-flow.js');

const { expect, assert } = chai;

chai.use(chaiAsPromised);
chai.use(solidity);

// random.use(seedrandom('rftg'));

// const bre = require("hardhat");
function range(size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}

describe("TokensFlow", function() {
  it("Checks correct transfers", async function() {
    this.timeout(60*1000*100);

    let expectations = [];

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("CarbonTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/CarbonTest.sol/CarbonTest.json')).abi;
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

    const [rootToken] = await createAuthority(tokensFlow, wallets[0], "", "");

    tokens.push(rootToken);
    for(let i = 0; i < 4; ++i) {
      const [token] = await createAuthority(tokensFlow, wallets[i+1], "", "");
      await tokensFlow.connect(wallets[i+1]).setTokenParent(token, rootToken, true);
      const txE = await tokensFlow.connect(wallets[0]).setEnabled([token, rootToken], true);
      await ethers.provider.getTransactionReceipt(txE.hash);
      tokens.push(token);
      const veryBigAmount = ethers.utils.parseEther('100000000000000000000000000000');
      const stupidWallet = new StupidWallet(wallets[0]);
      const limits = new LimitSetter(tokensFlow, stupidWallet);
      const oneFrac = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)).add(ethers.BigNumber.from(1));
      const tx2 = await limits.setNonRecurringFlow(token, rootToken, oneFrac, veryBigAmount);
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
            : ethers.utils.parseEther(random.float(0, 1000.0).toFixed(15)); // toFixed necessary not to overflow digits number
          const to = wallets[random.int(0, wallets.length -1)];
          const oldToBalance = await tokensFlow.balanceOf(to.address, token);
          const oldTotal = await tokensFlow.totalSupply(token);
          // console.log("Mint");
          const tx = await tokensFlow.connect(wallets[tokenIndex]).mint(to.address, token, amount, [], {gasLimit: 1000000});
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
            const tx = await tokensFlow.connect(wallet).exchangeToAncestor([fromToken, toToken], amount, [], {gasLimit: 1000000});
            await ethers.provider.getTransactionReceipt(tx.hash);
            const newFromBalance = await tokensFlow.balanceOf(wallet.address, fromToken);
            const newFromTotal = await tokensFlow.totalSupply(fromToken);
            const newToBalance = await tokensFlow.balanceOf(wallet.address, toToken);
            const newToTotal = await tokensFlow.totalSupply(toToken);
            {
              const change = newToBalance.sub(oldToBalance);
              console.log('zzz', [newToBalance, oldToBalance, change, amount])
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
              await tokensFlow.connect(wallet).exchangeToAncestor([fromToken, ethers.BigNumber.from(1)], amount, [], {gasLimit: 1000000});
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
