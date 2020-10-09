// Interface for our testing smart wallet.

// Quite primitive, has no support for example for calling contrat methods named `.transfer()`,
class SmartWallet {
    async init(addressOrContract, signer) {
        if(typeof addressOrContract === 'string') {
            const Contract = await ethers.getContractFactory("TestSmartWallet");
            const deployResult = await Contract.deploy(await signer.getAddress());
            this.contract = new ethers.Contract(deployResult.address, deployResult.abi, signer);
        } else {
            this.contract = addressOrContract;
        }
    }
    func(name, target, value, ...args) {
        const data = ""; // FIXME
        return this.contract.invoke(target, value, data);
    }
    transfer(to, amount) {
        this.contract.invoke(to, amount, []);
    }
    async owner() {
        return await this.contract.owner();
    }
}

module.exports = SmartWallet;