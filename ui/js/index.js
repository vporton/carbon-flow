"strict";

async function onLoad() {
    await defaultAccountPromise();
    document.getElementById('account').textContent = defaultAccount;
    console.log(web3.version)
    web3.eth.net.getNetworkType()
        .then(network => { document.getElementById('network').textContent = network; });
}

window.addEventListener('load', onLoad);