module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  const { deploy, log } = deployments;
  const [ deployer ] = await ethers.getSigners();

  const Carbon = await deployments.get("Carbon");
  const carbon = new ethers.Contract(Carbon.address, Carbon.abi, deployer);
  const deployResult = await deploy("ERC20OverERC1155", {
    from: await deployer.getAddress(), contractName: "RetiredERC20", args: [carbon.address, await carbon.retiredCreditsToken()]
  });
  log(`contract RetiredERC20 was deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`);
};
module.exports.dependencies = ["Carbon"];
