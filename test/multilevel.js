"strict";

const chai = require("chai");
const fs = require('fs');
const chaiAsPromised = require('chai-as-promised');
const random = require('random');
const seedrandom = require('seedrandom');

const { expect, assert } = chai;

chai.use(chaiAsPromised);

// random.use(seedrandom('rftg'));

describe("TokensFlow (limits)", function() {
  it("non-recurring", async function() { // TODO: duplicate code with above
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("TokensFlowTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/TokensFlowTest.json')).abi;
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const wallet0 = ethers.Wallet.createRandom();
    const wallet = wallet0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    let tokens = [];
    let tokens2 = [];

    {
      const tx = await tokensFlow.connect(wallet).newToken(0, "SubToken0", "S0", "https://example.com/0");
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id;
      tokens.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens[0], `SubToken1`, `S1`, `https://example.com/1`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens[1], `SubToken2`, `S2`, `https://example.com/2`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
    }

    {
      const tx = await tokensFlow.connect(wallet).newToken(0, "XSubToken0", "XS0", "https://example.com/0x");
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id;
      tokens2.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens2[0], `XSubToken1`, `XS1`, `https://example.com/1x`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens2.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens2[1], `XSubToken2`, `XS2`, `https://example.com/2x`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens2.push(token);
    }

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, tokens[2], ethers.utils.parseEther('5000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test flow:
    {
      const tx = await tokensFlow.connect(wallet).setNonRecurringFlow(tokens[1], ethers.utils.parseEther('1000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const tx = await tokensFlow.connect(wallet).setNonRecurringFlow(tokens[2], ethers.utils.parseEther('2000'));
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
      const tx = await tokensFlow.connect(wallet).setNonRecurringFlow(tokens[1], ethers.utils.parseEther('2000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const tx = await tokensFlow.connect(wallet).setNonRecurringFlow(tokens[2], ethers.utils.parseEther('1000'));
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
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToDescendant([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('2100'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("VM Exception while processing transaction: invalid opcode");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToDescendant([tokens[2], tokens[1], tokens[0]], ethers.utils.parseEther('1999'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[0])).to.be.equal(ethers.utils.parseEther('1'));
    expect(await tokensFlow.balanceOf(await wallet.getAddress(), tokens[2])).to.be.equal(ethers.utils.parseEther('4999'));

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

    {
      async function mycall(childs) {
        await tokensFlow.connect(wallet).exchangeToDescendant(childs, ethers.utils.parseEther('0'), [], {gasLimit: 1000000});
      }
      await expect(mycall([tokens2[2], tokens[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens2[2], tokens2[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([0, tokens[1], tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens[2], 0, tokens[0]])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
      await expect(mycall([tokens[2], tokens[1], 0])).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
  });
});
