"strict";

const { deployments } = require("@nomiclabs/buidler");
const chai = require("chai");
const { expect, assert } = chai;
const chaiAsPromised = require('chai-as-promised');
const random = require('random');
const seedrandom = require('seedrandom');
const SmartWallet = require('../lib/smart-wallet.js');

const { deploy } = deployments;

chai.use(chaiAsPromised);

// random.use(seedrandom('rftg'));

// function range(size, startAt = 0) {
//   return [...Array(size).keys()].map(i => i + startAt);
// }

describe("Main test", function() {
    beforeEach(async () => {
      await deployments.fixture();
    });
    it("Accordingly to the tech specificatin", async function() {
    const [ deployer, owner ] = await ethers.getSigners();

    // In this test Community Fund has an owner, in reality it will be controlled by voting
    const communityFundOwner0 = ethers.Wallet.createRandom();
    const communityFundOwner = communityFundOwner0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: communityFundOwner.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    // In this test communityFund is just a smart wallet.
    const cfDeployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [communityFundOwner.address] });
    const communityFund = new SmartWallet();
    const cfContract = new ethers.Contract(cfDeployResult.address, cfDeployResult.abi, communityFundOwner);
    await communityFund.init(cfContract);

    let walletOwners = [];
    for(let i = 0; i < 50; ++i) {
      const wallet0 = ethers.Wallet.createRandom();
      const wallet = wallet0.connect(ethers.provider);
      const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);
      walletOwners.push(wallet);
    }

    let smartWallets = [];
    for(let i = 0; i < walletOwners.length; ++i) {
      const deployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [walletOwners[i].address] });
      const smartWallet = new SmartWallet();
      const contract = new ethers.Contract(deployResult.address, deployResult.abi, walletOwners[i]);
      await smartWallet.init(contract);
      smartWallets.push(smartWallet);
    }
  });
});
