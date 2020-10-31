class StupidWallet {
    constructor(wallet) {
        this.wallet = wallet;
    }
    async invoke(contract, value, name, ...args) { // TODO: specify gas, etc.
        const obj = contract.connect(this.wallet);
        const tx = await obj[name].bind(obj)(...args, {value: value});
        return tx;
    }
}

module.exports = StupidWallet;