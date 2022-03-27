require('hardhat-deploy');
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

// This is a sample Buidler task. To learn how to create your own go to
// https://hardhat.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://hardhat.dev/config/ to learn more
module.exports = {
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    version: "0.7.3",
    optimizer: {
      enabled: true,
      runs: 200
    },
  },
  networks: {
    hardhat: {
      accounts: [ // too many?
        {
          privateKey: '0x0e206566a53a138f9500dd3ffaf12bbf3c773a34a0e78e6710b0726b82951e6d', // 0xfd95BF6727416050008dB2551c94C86D21bA3b77
          balance: '1188422437713965063903159255040',
        },
        {
          privateKey: '0x3d258b188e1e2bd69821990cc143830ce2be03dc24774c787090de8ef6bca214', // 0x4948C09461d37946Ea13b98d2C3f2D3C185fde2f
          balance: '1188422437713965063903159255040',
        },
        {
          privateKey: '0xdfe891177936f97142e0b8c6eefb7042d051536984a2bf2c46def1f01d37bf87', // 0x5530B1eC2bCD7B2fbDF780Ab5e7A4dE40541F3A8
          balance: '276701161105643274240',
        },
      ],
    },
    ganache: {
      gasLimit: 6000000000,
      defaultBalanceEther: 100,
      url: "http://localhost:8545",
      live: false,
      saveDeployment: false,
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/1d0c278301fc40f3a8f40f25ae3bd328",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY] : [],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 1,
    },
  },
};
