"strict";

const chai = require("chai");
const fs = require('fs');
const chaiAsPromised = require('chai-as-promised');
const random = require('random');
const seedrandom = require('seedrandom');
const StupidWallet = require('../lib/stupid-wallet.js');
const LimitSetter = require('../lib/limit-setter.js');
const { createAuthority } = require('../lib/carbon-flow.js');
const { ethers } = require("hardhat");

const { expect, assert } = chai;

chai.use(chaiAsPromised);

// random.use(seedrandom('rftg'));

describe("TokensFlow (limits)", function() {
  it("recurring", async function() { // TODO: duplicate code with below
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("CarbonTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/CarbonTest.sol/CarbonTest.json')).abi;
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const wallet0 = ethers.Wallet.createRandom();
    const wallet = wallet0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    let tokens = []; // needed?
    let tree = {};

    const [rootToken] = await createAuthority(tokensFlow, wallet, "", "");

    tokens.push(rootToken);
    for(let i = 0; i < 1; ++i) {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setEnabled([token, rootToken], true);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens.push(token);
      tree[token] = rootToken;
      await await tokensFlow.connect(wallet).setTokenParent(token, rootToken, true);
    }
    const childToken = tokens[1];

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, childToken, ethers.utils.parseEther('1000000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    const stupidWallet = new StupidWallet(wallet);
    {
      const limits = new LimitSetter(tokensFlow, stupidWallet);
      const tx = await limits.setRecurringFlow(
        childToken,
        rootToken,
        ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)),
        ethers.utils.parseEther('1000'),
        ethers.utils.parseEther('1000'),
        10,
        await tokensFlow.currentTime());
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test initial zero flow:
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, rootToken], ethers.utils.parseEther('0'), 1, []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, rootToken], ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }

    async function skipTime(seconds) {
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(seconds).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test non-zero flow:
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('500'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    await skipTime(2);
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('401'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(8);
    // Start new swap credit period here.
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('501'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('500'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(2);
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('100'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
  });
  it("non-recurring", async function() { // TODO: duplicate code with above
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("CarbonTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/CarbonTest.sol/CarbonTest.json')).abi;
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const wallet0 = ethers.Wallet.createRandom();
    const wallet = wallet0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    let tokens = []; // needed?
    let tree = {};

    const [rootToken] = await createAuthority(tokensFlow, wallet, "", "")

    tokens.push(rootToken);
    for(let i = 0; i < 1; ++i) {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setEnabled([token, rootToken], true);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens.push(token);
      tree[token] = rootToken;
      await await tokensFlow.connect(wallet).setTokenParent(token, rootToken, true);
    }
    const childToken = tokens[1];

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, childToken, ethers.utils.parseEther('1000000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    const stupidWallet = new StupidWallet(wallet);
    const limits = new LimitSetter(tokensFlow, stupidWallet);

    {
      // Set time to the future
      const tx = await limits.setNonRecurringFlow(childToken, rootToken, ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)), ethers.utils.parseEther('1000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test initial zero flow:
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, rootToken], ethers.utils.parseEther('0'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    return; // FIXME: Remove.
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, rootToken], ethers.utils.parseEther('0.01'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }

    async function skipTime(seconds) {
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(seconds).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test non-zero flow:
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('500'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    await skipTime(2); // jump over the above set future time
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(8);
    // Start new swap credit period here.
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([childToken, ethers.BigNumber.from(1)], ethers.utils.parseEther('1'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
  });
});
