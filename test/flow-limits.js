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
  it("recurring", async function() { // TODO: duplicate code with below
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
    let tree = {};

    const tx2 = await tokensFlow.connect(wallet).newToken(0, "M+C Token", "M+C", "https://example.com");
    const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash);
    const rootToken = createTokenEventIface.parseLog(receipt2.logs[0]).args.id;

    tokens.push(rootToken);
    for(let i = 0; i < 1; ++i) {
      const tx = await tokensFlow.connect(wallet).newToken(rootToken, `SubToken${i}`, `S${i}`, `https://example.com/${i}`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
      tree[token] = rootToken;
    }
    const childToken = tokens[1];

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, childToken, ethers.utils.parseEther('1000000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test initial zero flow:
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0'), 1, ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0.01'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }

    async function skipTime(seconds) {
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(seconds).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test non-zero flow:
    {
      const tx = await tokensFlow.connect(wallet).setRecurringFlow(childToken, ethers.utils.parseEther('1000'), ethers.utils.parseEther('1000'), 10, await tokensFlow.currentTime());
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1001'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('500'), ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    await skipTime(2);
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('401'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(8);
    // Start new swap credit period here.
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('501'), ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('500'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(2);
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('100'), ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
  });
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
    let tree = {};

    const tx2 = await tokensFlow.connect(wallet).newToken(0, "M+C Token", "M+C", "https://example.com");
    const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash);
    const rootToken = createTokenEventIface.parseLog(receipt2.logs[0]).args.id;

    tokens.push(rootToken);
    for(let i = 0; i < 1; ++i) {
      const tx = await tokensFlow.connect(wallet).newToken(rootToken, `SubToken${i}`, `S${i}`, `https://example.com/${i}`);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const token = createTokenEventIface.parseLog(receipt.logs[0]).args.id
      tokens.push(token);
      tree[token] = rootToken;
    }
    const childToken = tokens[1];

    console.log(`Checking minting and transferring...`); 

    {
      const tx = await tokensFlow.connect(wallet).mint(wallet.address, childToken, ethers.utils.parseEther('1000000'), [], {gasLimit: 1000000});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test initial zero flow:
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0'), 1, ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0.01'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }

    async function skipTime(seconds) {
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(seconds).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test non-zero flow:
    {
      // Set time to the future
      const tx = await tokensFlow.connect(wallet).setNonRecurringFlow(childToken, ethers.utils.parseEther('1000'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1001'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('500'), ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    await skipTime(2); // jump over the above set future time
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1001'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(8);
    // Start new swap credit period here.
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1001'), ethers.BigNumber.from(1), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1'), ethers.BigNumber.from(1), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
  });
});
