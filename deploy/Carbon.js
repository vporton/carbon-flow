const hre = require('hardhat');
const fs = require('fs');

module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  // const globalCommunityFund = process.env.GLOBAL_COMMUNITY_FUND;

  const deployResult = await deploy("Carbon", { from: deployer, args: [] });
  log(`contract Carbon was deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
  // log(`Global Community Fund controlling account: ${globalCommunityFund}`);
  log(`Write ABI and addresses...`);

  const filename = "artifacts/Carbon.deployed.json";
  let j;
  try {
    j = JSON.parse(fs.readFileSync(filename));
  }
  catch(_) {
    j = {};
  }
  const j2 = {
    ...j,
    ...{[hre.network.config.chainId]: deployResult},
  };
  fs.writeFileSync(filename, JSON.stringify(j2));
};
module.exports.tags = ["Carbon"];
