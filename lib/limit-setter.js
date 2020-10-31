// Quite primitive, has no support for example for calling contrat methods named `.transfer()`,
class LimitSetter {
    constructor(contract, smartWallet) {
        this.contract = contract;
        this.smartWallet = smartWallet;
        this.hashes = new Map(); // token => hash
    }
    async setNonRecurringFlow(token, remaining) {
        const data = {
            recurring: false,
            initialSwapCredit: remaining,
            maxSwapCredit: 0,
            swapCreditPeriod: 0,
            firstTimeEnteredSwapCredit: 0,
        };
        const tx = await this.smartWallet.invoke(this.contract, '0', 'setNonRecurringFlow', token, remaining, this.getTokenHash(token));
        this.hashes.set(token, this.calculate_hash(data));
        return tx;
    }
    async setRecurringFlow(token, maxSwapCredit, remainingSwapCredit, swapCreditPeriod, timeEnteredSwapCredit) {
        const data = {
            recurring: true,
            initialSwapCredit: remainingSwapCredit,
            maxSwapCredit: maxSwapCredit,
            swapCreditPeriod: swapCreditPeriod,
            firstTimeEnteredSwapCredit: timeEnteredSwapCredit,
        };
        const tx = await this.smartWallet.invoke(this.contract, '0', 'setRecurringFlow', token, maxSwapCredit, remainingSwapCredit, swapCreditPeriod, timeEnteredSwapCredit, this.getTokenHash(token));
        this.hashes.set(token, this.calculate_hash(data));
        return tx;
    }
    calculate_hash(data) {
        return ethers.utils.solidityKeccak256(
            ['bool', 'int256', 'int256', 'int', 'int'],
            [data.recurring, data.initialSwapCredit, data.maxSwapCredit, data.swapCreditPeriod, data.firstTimeEnteredSwapCredit]);
    }
    getTokenHash(token) {
        if(this.hashes.has(token)) {
            return this.hashes.get(token);
        } else {
            return this.calculate_hash({
                recurring: false,
                initialSwapCredit: 0,
                maxSwapCredit: 0,
                swapCreditPeriod: 0,
                firstTimeEnteredSwapCredit: 0,
            });
        }
    }
}

module.exports = LimitSetter;