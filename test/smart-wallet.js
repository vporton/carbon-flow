"strict";

const { deployments, ethers } = require("hardhat");
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

describe("SmartWallet", function() {
  it("Checks smart wallets", async function() {
    const [ deployer, owner ] = await ethers.getSigners();

    let walletOwners = [];
    for(let i = 0; i < 2; ++i) {
      const wallet0 = ethers.Wallet.createRandom();
      const wallet = wallet0.connect(ethers.provider);
      const tx = await owner.sendTransaction({to: wallet.address, value: ethers.utils.parseEther('1')}); // provide gas
      await ethers.provider.getTransactionReceipt(tx.hash);
      walletOwners.push(wallet);
    }

    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const erc20Contract = await SimpleERC20.connect(owner).deploy('TST', 'Test', 18, ethers.utils.parseEther('1000000'));

    let smartWallets = [];
    for(let i = 0; i < walletOwners.length; ++i) {
      const TestSmartWallet = await ethers.getContractFactory("TestSmartWallet")
      const contract = await TestSmartWallet.connect(walletOwners[i]).deploy(walletOwners[i].address);
      const smartWallet = new SmartWallet();
      await smartWallet.init(contract);
      smartWallets.push(smartWallet);
    }

    // Transfer Ether owner -> smartWallets[0] -> smartWallets[1]:
    {
      const tx = await owner.sendTransaction({to: smartWallets[0].address(), value: ethers.utils.parseEther('0.01')});
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const tx = await smartWallets[0].transfer(smartWallets[1].address(), ethers.utils.parseEther('0.01'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const balance = await ethers.provider.getBalance(smartWallets[1].address());
      expect(balance).to.equal(ethers.utils.parseEther('0.01'));
    }

    // Transfer ERC-20 owner -> smartWallets[0] -> smartWallets[1]:
    {
      const tx = await erc20Contract.connect(owner).transfer(smartWallets[0].address(), ethers.utils.parseEther('1.5'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const tx = await smartWallets[0].invoke(
        erc20Contract, '0', 'transfer', smartWallets[1].address(), ethers.utils.parseEther('1'));
      await ethers.provider.getTransactionReceipt(tx.hash);
    }
    {
      const balance = await erc20Contract.balanceOf(smartWallets[1].address());
      expect(balance).to.equal(ethers.utils.parseEther('1'));
    }
    return;
  });
});
