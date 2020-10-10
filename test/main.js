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
    console.log("Deploy the official contracts...");
    // await deployments.run(["Carbon"], { writeDeploymentsToFiles: false });
    await deployments.fixture();
  });
  it("Accordingly to the tech specification", async function() {
    this.timeout(60*1000*100);

    const [ deployer, owner ] = await ethers.getSigners();

    console.log("Creating the Community Fund and main contract...");

    // In this test Community Fund has one voter (in fact owner).
    const communityFundDAOVoter0 = ethers.Wallet.createRandom();
    const communityFundDAOVoter = communityFundDAOVoter0.connect(ethers.provider);
    const tx = await owner.sendTransaction({to: communityFundDAOVoter.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    // In this test communityFundDAO is just a smart wallet.
    const cfDAODeployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [communityFundDAOVoter.address] });
    const communityFundDAO = new SmartWallet();
    const cfDAOContract = new ethers.Contract(cfDAODeployResult.address, cfDAODeployResult.abi, communityFundDAOVoter);
    await communityFundDAO.init(cfDAOContract);

    const carbonDeployResult = await deployments.get("Carbon");
    const carbon = new ethers.Contract(carbonDeployResult.address, carbonDeployResult.abi, ethers.provider);
    const communityFund = new ethers.Contract(communityFundDAO.address(), carbonDeployResult.abi, communityFundDAOVoter);

    const nonRetiredToken = await carbon.nonRetiredCreditsToken();
    const retiredToken = await carbon.retiredCreditsToken();

    console.log("Creating the carbon authorities...");

    const authoritiesData = [
      { name: "Verra", symbol: "VER", url: "https://example.com/Verra" },
      { name: "The Gold Standard", symbol: "GOLD", url: "https://example.com/GoldStandard" },
      { name: "Climate Action Registry", symbol: "CLIM", url: "https://example.com/ClimateActionRegistry" },
    ];
    let authorities = [];
    for(let i = 0; i < authoritiesData.length; ++i) {
      // In reality should be controlled by a DAO
      const authoritityOwner0 = ethers.Wallet.createRandom();
      const authoritityOwner = authoritityOwner0.connect(ethers.provider);
      const tx = await owner.sendTransaction({to: authoritityOwner.address, value: ethers.utils.parseEther('1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);

      const info = authoritiesData[i];
      const tx2 = await carbon.connect(authoritityOwner).createAuthority(nonRetiredToken, info.name, info.symbol, info.url);
      await ethers.provider.getTransactionReceipt(tx2.hash);
      authorities.push(authoritityOwner);
    }

    console.log("Creating the zero pledgers...");

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

    console.log("Creating carbon credits...");

    let credits = [];
    for(let i = 0; i < 10000; ++i) {
      // console.log(`credit ${i}`);
      const authority = authorities[random.int(0, authorities.length - 1)];
      const owner = smartWallets[random.int(0, smartWallets.length - 1)];
      const arweaveHash = '123'; // just an arbitrary 256-bit number
      const tx = await carbon.connect(authority).createCredit(
        ethers.utils.parseEther('200'), owner.address(), arweaveHash);
      await ethers.provider.getTransactionReceipt(tx.hash);
      const credit = {}; // TODO
      credits.push(credit);
    }
  });
});
