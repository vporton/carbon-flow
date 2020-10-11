"strict";

// TODO: Support multiple networks, warn on an unsupported network.

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
    carbon.methods.tax().call().then(value => {
        document.getElementById('tax').textContent = value / 2**64 * 100;
    });
}

async function retire() {
    const amountStr = document.getElementById('amount').value;
    await doRetire(amountStr);
}

async function doRetire(amountStr) {
    const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
    const amount = web3.utils.toWei(amountStr);
    const tx = mySend(carbon, carbon.methods.retireCredit, [amount])
        .catch(e => {
            if(!(e.code === 4001)) {
                alert("Error: Do you have sufficient M- tokens for this operation?");
            }
        });
    const li = document.getElementById('transactionTmpl').cloneNode(true);
    const count = document.getElementById('transactions').childNodes.length;
    const id = `transaction-${count}`;
    li.setAttribute('id', id);
    document.getElementById('transactions').appendChild(li);
    document.querySelector(`#${id} .tokens`).textContent = amountStr;
    li.style.display = 'block';

    tx.then((receipt, error) => {
        const li = document.getElementById(id);
        li.className = receipt && receipt.status ? 'transaction confirmed' : 'transaction failed';
        document.querySelector(`#${id} .status`).textContent = !receipt ? 'rejected' : receipt.status ? 'confirmed' : 'failed';
        if(receipt) {
            document.querySelector(`#${id} .hash`).textContent = receipt.transactionHash;
        }
    });
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