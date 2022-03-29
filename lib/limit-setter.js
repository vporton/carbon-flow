class LimitSetter {
    constructor(contract, smartWallet) {
        this.contract = contract;
        this.smartWallet = smartWallet;
    }
    async setNonRecurringFlow(child, parent, coefficient, remaining) {
        const tx = await this.smartWallet.invoke(
            this.contract, '0', 'setNonRecurringFlow', child, parent, coefficient, remaining, await this.getTokenHash(child, parent));
        return tx;
    }
    async setRecurringFlow(child, parent, coefficient, maxSwapCredit, remainingSwapCredit, swapCreditPeriod, timeEnteredSwapCredit) {
        const tx = await this.smartWallet.invoke(
            this.contract,
            '0',
            'setRecurringFlow',
            child,
            parent,
            coefficient,
            maxSwapCredit,
            remainingSwapCredit,
            swapCreditPeriod,
            timeEnteredSwapCredit,
            await this.getTokenHash(child, parent));
        return tx;
    }
    calculateHash(data) {
        return ethers.utils.solidityKeccak256(
            ['bool', 'int256', 'int256', 'int', 'int'],
            [data.recurring, data.initialSwapCredit, data.maxSwapCredit, data.swapCreditPeriod, data.firstTimeEnteredSwapCredit]);
    }
    async getTokenHash(child, parent) {
        const tokenFlow = await this.smartWallet.invoke(this.contract, '0', 'tokenFlow', child, parent);
        const swapLimit = tokenFlow.limit;
        return this.calculateHash(swapLimit);
    }
}

module.exports = LimitSetter;