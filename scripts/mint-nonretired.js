const bre = require("@nomiclabs/hardhat");

function usage() {
  console.log("Mints non-retired tokens M-.\n" +
              "This program is intented for testing.\n" +
              "Usage:\nPRIVATE_KEY=0x<OWNER> RECIPIENT=0x<ADDRESS> AMOUNT=<NUMBER> " +
              "npx buidler run scripts/mint-nonretired.js --network ganache");
}

let provider = ethers.provider;

async function mint(owner, address, amount) {
  // const { deployer } = await getNamedAccounts();
  const Carbon = await deployments.get("Carbon");
  const carbon = new ethers.Contract(Carbon.address, Carbon.abi, provider);

  const arweaveHash = ethers.utils.formatBytes32String('vaeSho5IbaiGh5ui'); // just an arbitrary 32 bits

  const tx = await carbon.connect(owner).createCredit(2, ethers.utils.parseEther(amount), address, arweaveHash, {gasLimit: '1000000'});
  console.log("Credit creation request sent...");
  const receipt = await provider.getTransactionReceipt(tx.hash);
  console.log("... confirmed.");
}

async function main() {
  let recipient;
  try {
    recipient = ethers.utils.getAddress(process.env.RECIPIENT);
  }
  catch(_) {
    usage();
    return;
  }
  const amount = process.env.AMOUNT;
  if(!/^[0-9]+(\.[0-9]+)?$/.test(amount)) {
    usage();
    return;
  }

  let owner;
  try {
    owner = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  }
  catch(_) {
    console.log(_)
    console.log("Invalid private key.");
    return;
  }

  // Buidler always runs the compile task when running scripts through it. 
  // If this runs in a standalone fashion you may want to call compile manually 
  // to make sure everything is compiled
  // await bre.run('compile');

  await mint(owner, recipient, amount);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
