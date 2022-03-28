const fs = require('fs');

const createTokenEventAbi = JSON.parse(fs.readFileSync('artifacts/contracts/CarbonTest.sol/CarbonTest.json')).abi;

async function createAuthority(contract, wallet, nonRetiredUri, retiredUri) {
    const createTokenEventIface = new ethers.utils.Interface(createTokenEventAbi);

    const tx = await contract.connect(wallet).createAuthority(nonRetiredUri, retiredUri);
    const receipt2 = await ethers.provider.getTransactionReceipt(tx.hash);
    const nonRetiredToken = createTokenEventIface.parseLog(receipt2.logs[0]).args.id;
    const retiredToken = nonRetiredToken + 1;
    return [nonRetiredToken, retiredToken];
}

module.exports = {
    createAuthority,
};
