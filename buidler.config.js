usePlugin("@nomiclabs/buidler-waffle");
usePlugin('buidler-deploy');
usePlugin("@nomiclabs/buidler-ethers");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: "0.7.3",
    optimizer: {
      enabled: true,
      runs: 200
    },
  },
  networks: {
    buidlerevm: {
      accounts: [ // too many?
        {
          privateKey: '0x0e206566a53a138f9500dd3ffaf12bbf3c773a34a0e78e6710b0726b82951e6d', // 0xfd95BF6727416050008dB2551c94C86D21bA3b77
          balance: '0xf000000000000000000000000',
        },
        {
          privateKey: '0x3d258b188e1e2bd69821990cc143830ce2be03dc24774c787090de8ef6bca214', // 0x4948C09461d37946Ea13b98d2C3f2D3C185fde2f
          balance: '0xf000000000000000000000000',
        },
      ],
    },
    ganache: {
      gasLimit: 6000000000,
      defaultBalanceEther: 100,
      url: "http://localhost:8545",
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
    globalCommunityFund: {
      default: 1,
    },
    owner: {
      default: 2,
    },
  },
};
