"strict";

const { deployments } = require("@nomiclabs/hardhat");
const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
const mainTest = require('../lib/main-test.js');;
const SmartWallet = require('../lib/smart-wallet.js');
const { expect } = chai;

describe("Main test", function() {
  // beforeEach(async () => {
  //   console.log("Deploy the official contracts...");
  //   // await deployments.run(["Carbon"], { writeDeploymentsToFiles: false });
  //   await deployments.fixture();
  // });
  it("Accordingly to the tech specification", async function() {
    this.timeout(60*1000*100);

    await mainTest(chai, deployments, 100);
  });

  it("Retire more than we have", async function() {
    const { deploy } = deployments;
    const [ deployer, owner, communityFundDAOVoter ] = await ethers.getSigners();

    // In this test Community Fund has one voter (in fact owner).
    const tx = await owner.sendTransaction({to: await communityFundDAOVoter.getAddress(), value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    // In this test communityFundDAO is just a smart wallet.
    const cfDAODeployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [await communityFundDAOVoter.getAddress()] });
    const cfDAOContract = new ethers.Contract(cfDAODeployResult.address, cfDAODeployResult.abi, communityFundDAOVoter);
    const communityFundDAO = new SmartWallet();
    await communityFundDAO.init(cfDAOContract);

    const carbonDeployResult = await deploy("CarbonTest", { from: await deployer.getAddress(), args: [
      communityFundDAO.address(),
      "Retired carbon credits", "M+", "https://example.com/retired",
      "Non-retired carbon credits", "M-", "https://example.com/nonretired"] });
    const carbon = new ethers.Contract(carbonDeployResult.address, carbonDeployResult.abi, ethers.provider);

    await ethers.provider.getTransactionReceipt(tx.hash);
    {
      async function mycall() {
        const tx = await communityFundDAO.invoke(carbon, '0', 'retireCredit', '10');
      }
      await expect(mycall()).to.eventually.be.rejectedWith("VM Exception while processing transaction: revert");
    }
  });
});
