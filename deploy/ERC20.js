const fs = require('fs');

const retiredCreditsToken = 1;
const nonRetiredCreditsToken = 2;

module.exports = async ({
  getNamedAccounts,
  deployments,
}) => {
  if (!process.env.TEST) {
    return;
  }

  const { deploy, log } = deployments;
  const [ deployer ] = await ethers.getSigners();

  const Carbon = await deployments.get("Carbon");
  const carbon = new ethers.Contract(Carbon.address, Carbon.abi, deployer);
  const deployResult = await deploy("ERC20ToCarbon", {
    from: await deployer.getAddress(),
    contractName: "ERC20ToCarbon",
    args: [crypto.randomUUID(), crypto.randomUUID(), carbon.address, IERC20 erc20_]
  });
  console.log(deployResult);
  // await deployResultNonRetired.initialize(carbon.address, nonRetiredCreditsToken);
  // log(`contract NonRetiredERC20 was deployed at ${deployResultNonRetired.address} using ${deployResultNonRetired.receipt.gasUsed} gas`);
  // const deployResultRetired = await deploy("ERC20LockedERC1155", {
  //   from: await deployer.getAddress(), contractName: "RetiredERC20"
  // });
  // await deployResultRetired.initialize(carbon.address, retiredCreditsToken);
  // log(`contract RetiredERC20 was deployed at ${deployResultRetired.address} using ${deployResultRetired.receipt.gasUsed} gas`);
  // fs.writeFileSync("out/artifacts/addresses.js",
  //   `const carbonAddress = '${carbon.address}';\n` + 
  //   `const nonRetiredERC20Address = '${deployResultNonRetired.address}';\n` +
  //   `const retiredERC20Address = '${deployResultRetired.address}';\n`);
  // fs.writeFileSync("out/artifacts/ERC20Locked.abi", JSON.stringify(deployResultRetired.abi));
};
module.exports.dependencies = ["Carbon"];
