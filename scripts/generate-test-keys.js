const bre = require("@nomiclabs/buidler");
const fs = require('fs');
const yesno = require('yesno');

const outputFile = 'test-private-keys.json';

function generatePrivateKey() {
    return ethers.Wallet.createRandom().privateKey;
}

async function main() {
    if(fs.existsSync(outputFile)) {
        const overwrite = await yesno({ question: `Overwrite ${outputFile}?` });
        if(!overwrite) return;
    }

    let data = {};

    data.globalCommunityFundOwner = generatePrivateKey();

    data.authorities = [];
    for(let i = 0; i < 3; ++i) {
        data.authorities.push(generatePrivateKey());
    }

    data.netReducers = [];
    for(let i = 0; i < 50; ++i) {
        data.netReducers.push(generatePrivateKey());
    }

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 4));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
