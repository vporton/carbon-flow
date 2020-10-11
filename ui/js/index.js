"strict";

const retiredCreditsToken = 1; // M+ token
const nonRetiredCreditsToken = 2; // M- token

let carbonJsonInterfaceCache = null;

function carbonJsonInterface() {
    return new Promise((resolve) => {
        if(carbonJsonInterfaceCache) resolve(carbonJsonInterfaceCache);
        fetch("artifacts/Carbon.abi") // FIXME
            .then(response => resolve(carbonJsonInterfaceCache = response.json()));
    });
}

async function onLoad() {
    await defaultAccountPromise();
    document.getElementById('account').textContent = defaultAccount;
    web3.eth.net.getNetworkType()
        .then(network => { document.getElementById('network').textContent = network; });
    const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
    carbon.methods.balanceOf(defaultAccount, retiredCreditsToken).call().then(value => {
        document.getElementById('retired').textContent = web3.utils.fromWei(value);
    });
    carbon.methods.balanceOf(defaultAccount, nonRetiredCreditsToken).call().then(value => {
        document.getElementById('nonretired').textContent = web3.utils.fromWei(value);
    });
}

async function retire() {
    const amountStr = document.getElementById('amount').value;
    const amount = web3.utils.toWei(amountStr.replace(/^ *| *$/g, ''));
    await doRetire(amount);
}

async function doRetire(amount) {
    const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
    await mySend(carbon, carbon.methods.retireCredit, [amount])
        .catch(e => {
            if(!(e.code === 4001)) {
                alert("Error: Do you have sufficient M- tokens for this operation?");
            }
        });
    // TODO: Display current operations
}

function validateAmount() {
    const elt = document.getElementById('amount');
    if(/^[0-9]+(\.[0-9]+)?$/.test(elt.value)) {
        elt.className = "valid";
        document.getElementById('retire').disabled = false;
    } else {
        elt.className = "invalid";
        document.getElementById('retire').disabled = true;
    }
}

window.addEventListener('load', onLoad);