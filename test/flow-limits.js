"strict";

const chai = require("chai");
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
const random = require('random');
const seedrandom = require('seedrandom');

chai.use(chaiAsPromised);

// random.use(seedrandom('rftg'));

describe("TokensFlow (limits)", function() {
  it("Checks correct transfers", async function() {
    this.timeout(60*1000*100);

    console.log("Initializing...");

    const [ deployer, owner ] = await ethers.getSigners();

    const TokensFlow = await ethers.getContractFactory("TokensFlowTest");
    const tokensFlow = await TokensFlow.deploy();

    await tokensFlow.deployed();

    const createTokenEventAbi = [ "event NewToken(uint256 id, address owner, string name, string symbol, string uri)" ];
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const wallet0 = ethers.Wallet.createRandom();
    const wallet = wallet0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    let tokens = []; // needed?
    let tree = {};

    const tx2 = await tokensFlow.connect(wallet).newToken(0, true, "M+C Token", "M+C", "https://example.com");
    const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash);
    const rootToken = createTokenEventIface.parseLog(receipt2.logs[0]).args.id;

    tokens.push(rootToken);
    for(let i = 0; i < 1; ++i) {
      const tx = await tokensFlow.connect(wallet).newToken(rootToken, true, `SubToken${i}`, `S${i}`, `https://example.com/${i}`);
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
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('0.01'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }

    async function skipTime(seconds) {
      const tx = await tokensFlow.setCurrentTime(ethers.BigNumber.from(seconds).add(await tokensFlow.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    // Test non-zero flow:
    {
      const tx = await tokensFlow.connect(wallet).setTokenFlow(childToken, ethers.utils.parseEther('1000'), ethers.utils.parseEther('1000'), 10);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('1001'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('500'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    await skipTime(2);
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('401'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(8);
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('501'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      async function mycall() {
        await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('500'), [], {gasLimit: 1000000});
      }
      await expect(mycall()).to.eventually.be.rejectedWith("Transaction reverted without a reason");
    }
    await skipTime(5);
    {
      const tx = await tokensFlow.connect(wallet).exchangeToParent(childToken, ethers.utils.parseEther('200'), []);
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
  });
});
