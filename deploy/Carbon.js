module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy } = deployments;
  const { deployer, globalCommunityFund } = await getNamedAccounts();

  await deploy("Carbon", { from: deployer, args: [
      globalCommunityFund,
      "Retired carbon credits", "M+", "https://example.com/retired",
      "Non-retired carbon credits", "M-", "https://example.com/nonretired"] });
};
module.exports.tags = ["Carbon"];
