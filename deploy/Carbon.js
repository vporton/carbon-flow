module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy, log } = deployments;
  const { deployer, globalCommunityFund } = await getNamedAccounts();

  const deployResult = await deploy("Carbon", { from: deployer, args: [
      globalCommunityFund,
      "Retired carbon credits", "M+", "https://example.com/retired",
      "Non-retired carbon credits", "M-", "https://example.com/nonretired"] });
  log(`contract Carbon was deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
};
module.exports.tags = ["Carbon"];
