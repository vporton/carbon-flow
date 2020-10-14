const fs = require('fs');

module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const globalCommunityFund = process.env.GLOBAL_COMMUNITY_FUND;

  const deployResult = await deploy("Carbon", { from: deployer, args: [
      globalCommunityFund,
      "Retired carbon credits", "M+", "https://example.com/retired",
      "Non-retired carbon credits", "M-", "https://example.com/nonretired"] });
  log(`contract Carbon was deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
  log(`Global Community Fund controlling account: ${globalCommunityFund}`);
  log(`Write ABI and addresses...`)
  fs.writeFileSync("out/artifacts/Carbon.abi", JSON.stringify(deployResult.abi));
};
module.exports.tags = ["Carbon"];
