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
    console.log('index', web3.version);
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

window.addEventListener('load', onLoad);