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

    let tokens = []; // needed?

    {
      const tx = await tokensFlow.connect(wallet).newToken(0, "M+C Token", "M+C", "https://example.com");
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id;
      tokens.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens[0], `SubToken0`, `S0`, `https://example.com/0`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
    }
    {
      const tx = await tokensFlow.connect(wallet).newToken(tokens[1], `SubToken1`, `S1`, `https://example.com/1`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
    }

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, tokens[2], ethers.utils.parseEther('1000000'), [], {gasLimit: 1000000});
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
  });
});
