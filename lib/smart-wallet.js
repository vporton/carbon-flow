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
        const data = "0x"; // FIXME
        return this.contract.invoke(target, value, data);
    }
    transfer(to, amount) {
        return this.contract.invoke(to, amount, []);
    }
    address() {
        return this.contract.address;
    }
    async owner() {
        return await this.contract.owner();
    }
}

module.exports = SmartWallet;