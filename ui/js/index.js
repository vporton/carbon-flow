"strict";

// TODO: Support multiple networks, warn on an unsupported network.

const retiredCreditsToken = 1; // M+ token
const nonRetiredCreditsToken = 2; // M- token

let carbonJsonInterfaceCache = null;
// let lockedERC20JsonInterfaceCache = null;

function carbonJsonInterface() {
    return new Promise((resolve) => {
        if(carbonJsonInterfaceCache) resolve(carbonJsonInterfaceCache);
        fetch("artifacts/Carbon.abi")
            .then(response => resolve(carbonJsonInterfaceCache = response.json()));
    });
}

// function lockedERC20JsonInterface() {
//     return new Promise((resolve) => {
//         if(lockedERC20JsonInterfaceCache) resolve(lockedERC20JsonInterfaceCache);
//         fetch("artifacts/ERC20Locked.abi")
//             .then(response => resolve(lockedERC20JsonInterfaceCache = response.json()));
//     });
// }

async function loadNumbers() {
    const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
    await defaultAccountPromise();
    carbon.methods.balanceOf(defaultAccount, retiredCreditsToken).call()
        .then(value => {
            document.getElementById('retired').textContent = web3.utils.fromWei(value);
        })
        .catch(value => {
            document.getElementById('retired').textContent = "(cannot load)";
        });
    carbon.methods.balanceOf(defaultAccount, nonRetiredCreditsToken).call()
        .then(value => {
            document.getElementById('nonretired').textContent = web3.utils.fromWei(value);
        })
        .catch(value => {
            document.getElementById('nonretired').textContent = "(cannot load)";
        });
    carbon.methods.tax().call()
        .then(value => {
            document.getElementById('tax').textContent = value !== null ? value / 2**64 * 100 : "(cannot load)";
        });
}

async function loadNumbersERC20() {
//     const retiredERC20 = new web3.eth.Contract(await lockedERC20JsonInterface(), retiredERC20Address);
//     await defaultAccountPromise();
//     retiredERC20.methods.balanceOf(defaultAccount).call()
//         .then(value => {
//             document.getElementById('retiredERC20').textContent = web3.utils.fromWei(value);
//         })
//         .catch(value => {
//             document.getElementById('retiredERC20').textContent = "(cannot load)";
//         });
    await loadNumbers();
}

async function onConnect() {
    if(!window.web3) return;

    await defaultAccountPromise();
    document.getElementById('account').textContent = defaultAccount;
    if(web3.eth.net) {
        web3.eth.net.getNetworkType()
            .then(network => { document.getElementById('network').textContent = network; });
    }
    const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
    carbon.events.TransferSingle({filter: {_to: defaultAccount}}, loadNumbers);
    carbon.events.TransferBatch({filter: {_to: defaultAccount}}, loadNumbers);
    // const retiredERC20 = new web3.eth.Contract(await lockedERC20JsonInterface(), retiredERC20Address);
    // retiredERC20.events.Transfer({filter: {to: defaultAccount}}, loadNumbersERC20);
    // retiredERC20.events.Transfer({filter: {from: defaultAccount}}, loadNumbersERC20);
    await loadNumbersERC20();
}

async function transaction(tx, infoStr) {
    const li = document.getElementById('transactionTmpl').cloneNode(true);
    const count = document.getElementById('transactions').childNodes.length;
    const id = `transaction-${count}`;
    li.setAttribute('id', id);
    document.getElementById('transactions').appendChild(li);
    document.querySelector(`#${id} .info`).textContent = infoStr;
    li.style.display = 'block';

    tx.then(async (receipt, error) => {
        const li = document.getElementById(id);
        li.className = receipt && receipt.status ? 'transaction confirmed' : 'transaction failed';
        document.querySelector(`#${id} .status`).textContent = !receipt ? 'rejected' : receipt.status ? 'confirmed' : 'failed';
        if(receipt) {
            document.querySelector(`#${id} .hash`).textContent = receipt.transactionHash;
        }
        // if(receipt && receipt.status) {
        //     await loadNumbers();
        // }
    });
}

async function retire() {
    const amountStr = document.getElementById('amount').value.replace(/^ *| *$/g, '');
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
    transaction(tx, `${amountStr} M- tokens sale`);
}

// async function buyERC20() {
//     const amountStr = document.getElementById('amount2').value.replace(/^ *| *$/g, '');
//     await doBuyERC20(amountStr);
// }

// async function doBuyERC20(amountStr) {
//     const carbon = new web3.eth.Contract(await carbonJsonInterface(), carbonAddress);
//     const erc20 = new web3.eth.Contract(await lockedERC20JsonInterface(), retiredERC20Address);
//     const amount = web3.utils.toWei(amountStr);
//     await defaultAccountPromise();
//     const oldApproval = await carbon.methods.allowance(retiredCreditsToken, defaultAccount, retiredERC20Address).call();
//     const big2 = (new web3.utils.BN(2)).pow(new web3.utils.BN(128)).sub(new web3.utils.BN(1));
//     async function reallyBuy() {
//         const tx = mySend(erc20, erc20.methods.borrowERC1155, [amount, defaultAccount, defaultAccount])
//             .catch(e => {
//                 if(!(e.code === 4001)) {
//                     alert("Error: Do you have sufficient M+ tokens for this operation?");
//                 }
//             });
//         transaction(tx, `buy ${amountStr} M+ ERC-20`);
//     }
//     if(big2.gte(new web3.utils.BN(oldApproval))) {
//         const big = (new web3.utils.BN(2)).pow(new web3.utils.BN(256)).sub(new web3.utils.BN(1)).toString();
//         const txA = mySend(carbon, carbon.methods.approve, [retiredERC20Address, retiredCreditsToken, oldApproval, big])
//             .catch(e => {
//                 if(!(e.code === 4001)) {
//                     alert("Weird, cannot approve transaction.");
//                     return;
//                 }
//             });
//         transaction(txA, `approval to buy M+ ERC-20`);
//         await txA;
//         await reallyBuy();
//     } else {
//         await reallyBuy();
//     }
// }

// async function sellERC20() {
//     const amountStr = document.getElementById('amount2').value.replace(/^ *| *$/g, '');
//     await doSellERC20(amountStr);
// }

// async function doSellERC20(amountStr) {
//     const erc20 = new web3.eth.Contract(await lockedERC20JsonInterface(), retiredERC20Address);
//     const amount = web3.utils.toWei(amountStr);
//     await defaultAccountPromise();
//     const tx = mySend(erc20, erc20.methods.returnToERC1155, [amount, defaultAccount])
//         .catch(e => {
//             if(!(e.code === 4001)) {
//                 alert("Error: Do you have sufficient M+ tokens for this operation?");
//             }
//         });
//         transaction(tx, `sell ${amountStr} M+ ERC-20`);
//     }

function validateAmount() {
    const elt = document.getElementById('amount');
    if(/^ *[0-9]+(\.[0-9]+)? *$/.test(elt.value)) {
        elt.className = "valid";
        document.getElementById('retire').disabled = false;
    } else {
        elt.className = "invalid";
        document.getElementById('retire').disabled = true;
    }
}

function validateAmount2() {
    // const elt = document.getElementById('amount2');
    // if(/^ *[0-9]+(\.[0-9]+)? *$/.test(elt.value)) {
    //     elt.className = "valid";
    //     document.getElementById('buyERC20').disabled = false;
    //     document.getElementById('sellERC20').disabled = false;
    // } else {
    //     elt.className = "invalid";
    //     document.getElementById('buyERC20').disabled = true;
    //     document.getElementById('sellERC20').disabled = true;
    // }
}

// window.addEventListener('load', onLoad);