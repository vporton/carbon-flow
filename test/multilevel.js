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

    let tokens = [];
    let tokens2 = [];

    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      tokens.push(token);
    }
    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setDisabled([token, tokens[0]], false);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens.push(token);
    }
    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setDisabled([token, tokens[1]], false);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens.push(token);
    }

    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      tokens2.push(token);
    }
    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setDisabled([token, tokens2[0]], false);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens2.push(token);
    }
    {
      const [token] = await createAuthority(tokensFlow, wallet, "", "");
      // const txE = await tokensFlow.connect(wallet).setDisabled([token, tokens2[1]], false);
      // await ethers.provider.getTransactionReceipt(txE.hash);
      tokens2.push(token);
    }

    const stupidWallet = new StupidWallet(wallet);
    const limits = new LimitSetter(tokensFlow, stupidWallet);

    console.log(`Checking minting and transferring...`);

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, tokens[2], ethers.utils.parseEther('5000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test flow:
    {
      await await tokensFlow.connect(wallet).setTokenParent(tokens[1], tokens[0], true);
      const tx = await limits.setNonRecurringFlow(tokens[1], tokens[0], ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)), ethers.utils.parseEther('1000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      await await tokensFlow.connect(wallet).setTokenParent(tokens[2], tokens[1], true);
      const tx = await limits.setNonRecurringFlow(tokens[2], tokens[1], ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)), ethers.utils.parseEther('2000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('1500'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('1000'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[0])).to.be.equal(ethers.utils.parseEther('1000'));
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[2])).to.be.equal(ethers.utils.parseEther('4000'));

    {
      const tx = await limits.setNonRecurringFlow(tokens[1], tokens[0], ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)), ethers.utils.parseEther('2000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const tx = await limits.setNonRecurringFlow(tokens[2], tokens[1], ethers.BigNumber.from(2).pow(ethers.BigNumber.from(64)), ethers.utils.parseEther('1000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToAncestor([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('1500'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToAncestor([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('1000'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[0])).to.be.equal(ethers.utils.parseEther('2000'));
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[2])).to.be.equal(ethers.utils.parseEther('3000'));

    {
      async function mycall(childs) {
        await tokensFlow.connect(wallet).exchangeToAncestor(childs, ethers.utils.parseEther('0'), [], {gasLimit: 1000000});
      }
      await expect(mycall([tokens2[2], tokens[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens2[2], tokens2[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([0, tokens[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens[2], 0, tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens[2], tokens[1], 0])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
  });
});
