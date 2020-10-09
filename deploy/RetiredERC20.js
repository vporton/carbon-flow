module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy } = deployments;
  const [ deployer ] = await ethers.getSigners();

  const Carbon = await deployments.get("Carbon");
  const carbon = new ethers.Contract(Carbon.address, Carbon.abi, deployer);
  await deploy("ERC20OverERC1155", {
    from: await deployer.getAddress(), contractName: "RetiredERC20", args: [carbon.address, await carbon.retiredCreditsToken()]
  });
};
module.exports.dependencies = ["Carbon"];
