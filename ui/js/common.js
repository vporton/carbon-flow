"strict";

if(window.ethereum) {
    ethereum.autoRefreshOnNetworkChange = false;

    // TODO: Don't reload everything.
    ethereum.on('chainChanged', () => {
        document.location.reload();
    });
}

const MewConnect = require('mewconnect');

function safe_tags(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function safe_attrs(str) {
    return safe_tags(str).replace(/"/g,'&quot;').replace(/'<'/g,'&apos;');
}

let defaultAccount;
// web3.eth.defaultAccount = web3.eth.accounts[0];
async function defaultAccountPromise() {
    return web3 && web3.currentProvider ? (await getWeb3()).eth.getAccounts() : null;
}

let myWeb3 = null;

function getNetworkName() {
    return new Promise((resolve) => {
        if(web3.eth.net && web3.eth.net.getNetworkType) {
            web3.eth.net.getNetworkType()
                .then(network => {
                    
                    resolve(network);
                });
        } else {
            if(web3.version.getNetwork) {
                web3.version.getNetwork((err, netId) => {
                    switch (netId) {
                      case "1":
                        resolve('mainnet')
                        break
                      case "2":
                        resolve('Morden')
                        break
                      case "3":
                        resolve('ropsten')
                        break
                      default:
                        resolve('unknown')
                    }
                });
            } else {
                resolve('mainnet'); // TODO: hack
            }
        }
    });
}

async function myWeb3Modal() {
    // const MewConnect = require('mewconnect');

    const Web3Modal = window.Web3Modal.default;
    const networkName = await getNetworkName();
    let providerOptions = {};
    if(networkName !== 'private') {
        providerOptions.mewconnect = {
            package: MewConnect, // required
            options: {
                infuraId: "1d0c278301fc40f3a8f40f25ae3bd328" // required (FIXME)
            },
        };
    };

    return new Web3Modal({
        network: networkName == 'main' ? 'mainnet' : networkName,
        cacheProvider: true,
        providerOptions
    });
}

let myWeb3Provider = null;

async function getWeb3() {
    if(myWeb3) return myWeb3;

    if(window.ethereum) {
        const web3Modal = await myWeb3Modal();
        myWeb3Provider = await web3Modal.connect();
    }
    return myWeb3 = myWeb3Provider ? new Web3(myWeb3Provider) : null;
}

function mySend(contract, method, args, sendArgs, handler) {
    sendArgs = sendArgs || {}
    return method.bind(contract)(...args).estimateGas({gas: '1000000', from: defaultAccount, ...sendArgs}).
        then((estimatedGas) => {
            const gas = String(Math.floor(estimatedGas * 1.15) + 24000);
            if(handler !== undefined)
                return method.bind(contract)(...args).send({gas, from: defaultAccount, ...sendArgs}, handler);
            else
                return method.bind(contract)(...args).send({gas, from: defaultAccount, ...sendArgs});
        });
}

async function connectWeb3() {
    web3 = await getWeb3();
    const dap = await defaultAccountPromise();
    defaultAccount = dap ? dap[0] : null;
}

async function reconnectWeb3() {
    if(!window.web3) return;
    if(myWeb3Provider.close)
        await myWeb3Provider.close();
    const web3Modal = await myWeb3Modal();
    await web3Modal.clearCachedProvider();
    myWeb3 = null;
    await connectWeb3();
}

async function onLoad() {
    if(window.ethereum) window.ethereum.enable();

    if(!window.web3 || !window.web3.currentProvider) {
        document.getElementById("noWeb3NetWarning").style.display = 'block';
    } else {
        await connectWeb3();
    }
    onConnect(); // hack
}

//window.addEventListener('load', onLoad); // window.web3.currentProvider.chainId is sometimes undefined (https://github.com/brave/brave-browser/issues/10854)
window.addEventListener('load', onLoad);