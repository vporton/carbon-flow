// Interface for our testing smart wallet.

// Quite primitive, has no support for example for calling contrat methods named `.transfer()`,
class SmartWallet {
    async init(addressOrContract, signer) {
        if(typeof addressOrContract === 'string') {
            const Contract = await ethers.getContractFactory("TestSmartWallet");
            const deployResult = await Contract.deploy(await signer.getAddress());
            this.contract = new ethers.Contract(deployResult.address, Contract.abi, signer);
        } else {
            this.contract = signer ? addressOrContract.connect(signer) : addressOrContract;
        }
        // this.signer = signer;
    }
    async invoke(contract, value, name, ...args) { // TODO: specify gas, etc.
        const data = contract.interface.encodeFunctionData(name, args)
        const tx = await this.contract.invoke(contract.address, value, data);
        return tx;
        // return contract.interface.decodeFunctionResult(name, tx.data); // Why does this not work?
        // const fullName = Object.keys(contract.interface.functions).filter(x => contract.interface.functions[x].name == name)[0];
        // const types = contract.interface.functions[fullName].outputs;
        // const coder = new ethers.utils.AbiCoder();
        // return coder.decode(types, tx.data);
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