"strict";

const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const random = require('random');
const seedrandom = require('seedrandom');
const SmartWallet = require('../lib/smart-wallet.js');
const StupidWallet = require('../lib/stupid-wallet.js');
const LimitSetter = require('../lib/limit-setter.js');
const { createAuthority } = require('../lib/carbon-flow.js');

async function mainTest(chai, deployments, numberOfCredits) {
    chai.use(chaiAsPromised);

    const { expect, assert } = chai;
    const { deploy } = deployments;

    random.use(seedrandom('rftg'));

    const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/CarbonTest.sol/CarbonTest.json')).abi;
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const createCreditEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/Carbon.sol/Carbon.json')).abi;
    const createCreditEventIface = new ethers.utils.Interface(createCreditEventAbi);

    const testKeys = JSON.parse(fs.readFileSync('test-private-keys.json'));

    // Owner holds initial balance, etc.
    const [ deployer, owner ] = await ethers.getSigners();

    console.log("Creating the Community Fund and main contract...");

    // In this test Community Fund has one voter (in fact owner).
    const communityFundDAOVoter = new ethers.Wallet(testKeys.globalCommunityFundOwner).connect(ethers.provider);
    const tx = await owner.sendTransaction({to: communityFundDAOVoter.address, value: ethers.utils.parseEther('1')}); // provide gas
    await ethers.provider.getTransactionReceipt(tx.hash);

    // In this test communityFundDAO is just a smart wallet.
    const cfDAODeployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [communityFundDAOVoter.address] });
    const cfDAOContract = new ethers.Contract(cfDAODeployResult.address, cfDAODeployResult.abi, communityFundDAOVoter);
    const communityFundDAO = new SmartWallet();
    await communityFundDAO.init(cfDAOContract);

    const carbonDeployResult = await deploy("CarbonTest", { from: await deployer.getAddress(), args: [
      communityFundDAO.address(),
      "Retired carbon credits", "M+", "https://example.com/retired",
      "Non-retired carbon credits", "M-", "https://example.com/nonretired"] });
    const carbon = new ethers.Contract(carbonDeployResult.address, carbonDeployResult.abi, ethers.provider);
    // const communityFund = new ethers.Contract(communityFundDAO.address(), carbonDeployResult.abi, communityFundDAOVoter);

    const retiredToken = 1; // await carbon.retiredCreditsToken();
    const nonRetiredToken = 2; // await carbon.nonRetiredCreditsToken();

    const nonRetiredDeployResult = await deploy("NonRetiredERC20", { from: await deployer.getAddress(), contract: "ERC20OverERC1155" });
    const nonRetiredERC20 = new ethers.Contract(nonRetiredDeployResult.address, nonRetiredDeployResult.abi, ethers.provider);
    nonRetiredERC20.connect(deployer).initialize(carbon.address, nonRetiredToken);
    const retiredDeployResult = await deploy("RetiredERC20", { from: await deployer.getAddress(), contract: "ERC20OverERC1155" });
    const retiredERC20 = new ethers.Contract(retiredDeployResult.address, retiredDeployResult.abi, ethers.provider);
    retiredERC20.connect(deployer).initialize(carbon.address, retiredToken);

    const limits = new LimitSetter(carbon, communityFundDAO);

    console.log("Creating the carbon authorities...");

    const authoritiesData = [
      { name: "Verra", symbol: "VER", url: "https://example.com/Verra" },
      { name: "The Gold Standard", symbol: "GOLD", url: "https://example.com/GoldStandard" },
      { name: "Climate Action Registry", symbol: "CLIM", url: "https://example.com/ClimateActionRegistry" },
    ];
    let authorityIndexes = {};
    let authorities = [];
    let authorityTokens = [];
    for(let i = 0; i < authoritiesData.length; ++i) {
      // In reality should be controlled by a DAO
      const authoritityOwner = new ethers.Wallet.createRandom(testKeys.authorities[i]).connect(ethers.provider);
      const tx = await owner.sendTransaction({to: authoritityOwner.address, value: ethers.utils.parseEther('15')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);

      const info = authoritiesData[i];
      const tx2 = await createAuthority(carbon, authoritityOwner, "", "");
      const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash);
      const token = createTokenEventIface.parseLog(receipt2.logs[0]).args.id; // TODO: check this carefully
      const tx3 = await communityFundDAO.invoke(carbon, '0', 'setEnabled', nonRetiredToken, [token], true);
      await ethers.provider.getTransactionReceipt(tx3.hash);

      const veryBigAmount = ethers.utils.parseEther('100000000000000000000000000000');
      const tx4 = await limits.setNonRecurringFlow(token, veryBigAmount);
      await ethers.provider.getTransactionReceipt(tx4.hash);  

      authorities.push(authoritityOwner);
      authorityTokens.push(token);
      authorityIndexes[await authoritityOwner.getAddress()] = i;
    }

    console.log("Creating the zero pledgers...");

    let walletOwners = [];
    for(let i = 0; i < 50; ++i) {
      const wallet = new ethers.Wallet(testKeys.netReducers[i]).connect(ethers.provider);
      const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('0.1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);
      walletOwners.push(wallet);
    }

    let smartWallets = [];
    let smartWalletsIndexes = [];
    for(let i = 0; i < walletOwners.length; ++i) {
      const deployResult = await deploy("TestSmartWallet", { from: await deployer.getAddress(), args: [walletOwners[i].address] });
      const smartWallet = new SmartWallet();
      const contract = new ethers.Contract(deployResult.address, deployResult.abi, walletOwners[i]);
      await smartWallet.init(contract);
      smartWallets.push(smartWallet);
      smartWalletsIndexes[smartWallet.address()] = i;
    }

    console.log("Creating carbon credits and local tokens...");

    let credits = [];
    for(let i = 0; i < numberOfCredits; ++i) {
      // console.log(`credit ${i}`);
      const authorityIndex = random.int(0, authorities.length - 1);
      const authority = authorities[authorityIndex];
      const authorityToken = authorityTokens[authorityIndex];
      const netReducer = smartWallets[random.int(0, smartWallets.length - 1)];
      const arweaveHash = ethers.utils.formatBytes32String('vaeSho5IbaiGh5ui'); // just an arbitrary 32 bits
      const tx = await carbon.connect(authority).createCredit(
        authorityToken, ethers.utils.parseEther('200'), netReducer.address(), arweaveHash);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const credit = createCreditEventIface.parseLog(receipt.logs[1]).args; // TODO: check carefully
      credits.push({ id: credit.id, netReducer: credit.owner, authority: credit.authority, amount: credit.amount });
    }
    expect(await carbon.totalSupply(nonRetiredToken)).to.equal(ethers.BigNumber.from('0')); // not yet swapped

    console.log("Exchanging to M-...");

    async function skipTime(seconds) {
      const tx = await carbon.connect(owner).setCurrentTime(ethers.BigNumber.from(seconds).add(await carbon.currentTime()));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }

    skipTime(1000);

    for(let netReducer of smartWallets) { // TODO: more tests
      for(let token of authorityTokens) {
        const balance = await carbon.balanceOf(netReducer.address(), token);
        if(!balance.eq(ethers.BigNumber.from(0))) {
          const tx = await netReducer.invoke(carbon, '0', 'exchangeToAncestor', [token, ethers.BigNumber.from(2)], balance, []);
          await ethers.provider.getTransactionReceipt(tx.hash);
        }
      }
    }
    expect(await carbon.totalSupply(nonRetiredToken)).to.equal(ethers.utils.parseEther('200').mul(ethers.BigNumber.from(String(numberOfCredits))));

    console.log("Retiring carbon credits...")

    const allowedDeviation = ethers.BigNumber.from(numberOfCredits * 10);

    // Retire all the M- tokens:
    for(let i = 0; i < smartWallets.length; ++i) { // TODO: more tests
      const netReducer = smartWallets[i];
      const balance = await carbon.balanceOf(netReducer.address(), nonRetiredToken);
      expect(await nonRetiredERC20.balanceOf(netReducer.address())).to.be.equal(balance);
      const tx = await netReducer.invoke(carbon, '0', 'retireCredit', balance);
      await ethers.provider.getTransactionReceipt(tx.hash);
      const retiredBalance = await carbon.balanceOf(netReducer.address(), retiredToken);
      const diff = retiredBalance.sub(balance.mul(90).div(100)).abs();
      expect(diff).to.be.below(allowedDeviation); // not yet swapped
    }
    expect(await carbon.totalSupply(nonRetiredToken)).to.equal(ethers.BigNumber.from('0')); // was retired
    {
      const retiredBalance = await carbon.balanceOf(communityFundDAO.address(), retiredToken);
      expect(await retiredERC20.balanceOf(communityFundDAO.address())).to.be.equal(retiredBalance);
      const diff = retiredBalance.sub(
        ethers.utils.parseEther('200').mul(ethers.BigNumber.from(String(numberOfCredits))).mul(10).div(100)
      ).abs();
      expect(diff).to.be.below(allowedDeviation);
    }
}

module.exports = mainTest;