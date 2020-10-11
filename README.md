# Carbon Flow

See also https://youtu.be/Pv7k7FiUbKM (remark: the installation procedure
changed a little since recoding this video, also now the numbers update
automatically after confirmed transactions).

It is a solution of
https://gitcoin.co/issue/MPlus4Climate/MPlusToolKit/1/100023834 bounty
(work in progress!)

![Screenshot](https://raw.githubusercontent.com/vporton/carbon-flow/main/doc/screenshot.png "Screenshot")

The task was formulated to produce an ERC-20 token, but I do a ERC-1155 token.
The discrepancy is easily solvable by creating a ERC-1155/ERC-20 bridge.

## Installation

Prerequisites: Node.js, yarn, GNU make.

To install contracts:
```sh
yarn install
GLOBAL_COMMUNITY_FUND=0x<THE-DAO-ADDRESS> npx buidler deploy --network NETWORK
```
(replace `NETWORK` by `mainnet` (or another network we will choose later) when doing
the real deployment, for testing you can use `--network buidlerevm`).

## Testing

### Testing smart contracts

```sh
yarn install
npx buidler test
```

### Creating 10000 credit records

First run
```sh
yarn install
```

The requested 10000 credit records can be created by first running
```sh
npx ganache-cli -d
```
and then (without exiting from `ganache-cli`) running
```sh
npx buidler run scripts/create-10000-credits.js
```

### Testing the Web app

Run Ganache (a blockchain for testing)
```sh
npx ganache-cli -d
```
(This command should be kept running during the entire test!)

Notice the private key `(1)` (it is `0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1`,
a private key to be used only for testing).

To install the Web application (dApp) with this test blockchain:
```sh
yarn install
GLOBAL_COMMUNITY_FUND=0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0 npx buidler deploy --network ganache
make
```

Then copy the folder `out/ui/` to a Web server and run the app in that folder.

Configure your crypto Web browser to use `localhost:8545` if testing with Ganache.

You will see zero tokens at your account.

Run
```sh
PRIVATE_KEY=0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1 RECIPIENT=<YOUR-ADDRESS> AMOUNT=100 npx buidler run scripts/mint-nonretired.js --network ganache
```
(Replace `<YOUR-ADDRESS>` by the Ethereum address you use in the browser.)

This will add 100 M- tokens to this address. Reload the app page and now you can retire tokens.

Note that the above testing procedure does not show a real method of producing M- tokens
(though this test script could be used to mint real tokens for real authorities,
it is not convenient and error prone). This is intentional, as the procedure of registering
carbon credits can be done _only_ in conjunction with
"Design And Implementation Of M+C Community Fund Management Platform" (another bounty), because
the procedure of registering tokens needs to be a part of a DAO to be developed as a part of
that bounty. However, I created the necessary smart contract methods for accomplishment of that
bounty.

Note that I also don't directly support storing IDs of the "authorized signers" when creating a
carbon credit record, as required in the tech specification. Instead I allow to pass a hash of
an Arweave file. This file should contain additional data, including the IDs of these signers.
The data format can be decided later, but it may be JSON and may contain IDs of authorized signers.
If it is necessary to store these "signers" in an Ethereum chain, it is easy to modify my contract
before the final release.

## Kinds of tokens

See `doc/tree.odg` or `doc/tree.pdf`.

There are basically two kinds of tokens:

- non-retired carbon tokens;

- retired carbon tokens.

Each token has a token owner. Each token has either a parent token or no parent token.

There are two "main tokens" (they have no parents):

- the M+ token represents retired carbon credits;
- the M- token represents non-retired carbon credits.

The token owner whose ultimate ancestor is the owner of M- is called an _carbon credit authority_.

So, we have the M+ token _and_ a tree of tokens of child/parent
relationships between authorities rooting in M- token (there may be more, see the next paragraph).

Remark: In fact they are not trees but directed graphs.

There may be token owners who are not authorities (either tokens
unrelated with our carbon counting project (That's fine, there is no reason to use my project only
for carbon counting, it may be useful also for something other.) or token owners temporarily not having
M+ or M- as the ultimate ancestor).

A token owner can change its parent at any moment of time by its own will. (But
if he does this, his token is disabled (unless now has not parent) and his swap limits
(see below) are reset to zero until its new parent wishes to increase his limits.)

## Token flow

Anybody can swap a child token he holds for the same amount of its parent token.

It is useful to build a hieararchical system of authorities with the root in M- token.  

## Security measures

Among the usual Ethereum security measures like making tokens "owned" by someone
restricting others' right for manipulation of the token, there are the following
"special" security measures.

### Limiting token flow

The amount of child tokens that can be swapped for a parent token is limited
by an algorithm parametrized with the following numbers:

- C - max swap amount (a number of tokens);

- P - swap credit period (a number of seconds).

This is to avoid some entity maliciously or erroneously minting producing a
giant number of tokens and then swapping them for a valuable parent token faster than an
ancestor token owner removes it from its descendants.

The idea is that one can swap up to C tokens per swap period P.

TL;DR: The algorithm is as follows:

- At any moment of time we are either in a swap credit or no (intially we are
  not in a swap credit).

- At any moment of time anyone can swap up to c token, (c is called
  _the remaining swap credit_).

- c = C if we were not in a swap credit.

- c is set to C when we enter into a swap credit.

- c is decreased by s where s is the swap amount at every swap.

- We enter swap credit if a swap not inside a swap credit happens.

- We exit from swap credit as soon as P seconds passes since last entering
  swap credit.

In the case if somebody needs to exceed a swap credit amount for a legitimate
reason he may write an email to the parent token owner asking to raise the limits.

### Measures for theft recovery

I will use the word _theft_ to denote both malignant generation of tokens and generating
too big number fo tokens by mistake.

Any authority token  can be disabled.

Anyone upward in the tree can disable any of its descendants.

Disabled authority cannot create credits, disabled token cannot be transferred.

Remark: A malignant or otherwise weird user may produce too long chain of descendants
of some token, making it impossible to disable all the descendants because of gas
limitations. In this case, only some of the ancestors in the chain should be disabled.

Disabled tokens also can't enable/disable other tokens.

Remark: Because it is in reality a directed graph, not a tree, two tokens in the tree
could be disabled by each other. We prevent the special case of an authority disabling
itself, because otherwise it can't enable itself back.

#### Theft recovery procedure

See also https://ethereum.stackexchange.com/q/88235/36438

In the case if a big enough theft is detected somewhere in the tree of authorities, the
blamed entity and possibly several its ancestors should be disabled as soon as possible,
while they did not yet swap their tokens to the upper levels.

After it is disabled, ones holding invalid tokens should be asked to burn them.

If enough tokens were burn and the reason of the theft was eliminated, the disabled
tokens should be enabled again.

Should we allow authorities (e.g. GCF) to burn child tokens (also their own tokens?)
It is a notable dilemma between democracy and personal freedom.

## ERC-20 tokens

TODO: More tests.

Our ERC-20 tokens wrap corresponding ERC-1155 so that the amounts on accounts of
our ERC-20 and the corresponding ERC-1155 token are always equal. Transfer or approval
of one of these two tokens automatically transfers or approves also the other one.

_Our ERC-20 tokens have a bug (do not fully conform to the ERC-20 standard):_
the system is not notified of ERC-1155 transfers and other events by the corresponding
ERC-20 events.

The practical implications of the bug are as follows:

- A user may be not notified (e.g. by email sent by EtherScan.io) about a transfer
  or other event with his token.

- Some software for re-creating a new ERC-20 token with the same balances as our token
  may produce a new token with wrong balances.

- Other failures.

This bug probably could be fixed, but:

- Fixing it would significally increase gas usage, what is not green.

- Most ERC-20 software does work correctly with our tokens despite this bug.

- ERC-20 is an old legacy standard, ERC-1155 tokens should be used instead.
  It is expected that after a few years most Ethereum wallets and exchanged will
  support ERC-1155, so ERC-20 support is just a temporary measure.

- You also should prefer to use the ERC-1155 version, because it uses less gas.

## TODO

Create 10000 credit records at a public testnet?

Documentation comments in contracts.

Indexed events.

Test batch transfers.

Should allow to allocate a swap credit once, not periodically?

See also `TODO` and `FIXME` comments in the source.

Ethereum provider selection does not work on Firefox (but you still can use MetaMask).

Lint Solidity.

### Things intentionally not done or done differently

### Marker for retired carbon credit serial numbers

The bounty required
_Create 10.000 carbon credit serial numbers, including a marker to identify them as “retired”_.
That's a nonsense, because a carbon credit record may be retired partially, so it makes no sense to
mark it either as retired or non-retired.

### Manual approval process

The specification says:

> Create that protocol as a) manual approval process by an authorized member of the M+ governance team, and b) as an automatically executing smart contract.

This makes no sense in my system: The only way to check if M- tokens belong to a certain owner is
to check if he has them on its Ethereum account. But if he has Ethereum account (and intends to use
the resulting M+ tokens) then he has a private key, an Ethereum wallet and can trigger the M- -> M+
swap procedure himself, it just makes no sense to ask a member of M+ governance team to do it for him.

Well, it makes a little sense: It may be useful for owners of Ethereum wallets not supporting smart
contract calls. So, if you request me to add this feature I _will_ do it, but again it makes quite
little sense.

Oh, also it makes sense in the case if the account owner lost his private key and wants an
authorized member of the M+ governance team to restore his funds, but that thing is against the
Ethereum philosopy (however see the alternative solution of this problem below).

It could be implemented by having two kinds of authority tokens: M- tree issuers and retirers.
M- tree issuers would do the same as authorities do now, and retirers would instead do retirement
on behalf of users (net reducers). Before doing the swap on behalf of a user, need to check in
the smart contract that this retirer is a descendant of a certain token (any token can be choosen,
e.g. M- or M+; note that the amounts of these tokens on any wallets would be always zero) and all
its ancestors are not disabled before doing the retirement operation. The amount of retirement would
be restricted by rules like limiting tokens flow above.

Anyway, if somebody wants to operate in the system without having an Ethereum account, an authority
may arrange for him for somebody to hold a wallet with a private key (or a smart wallet, e.g. a DAO
if the money hold a big to be sure not one M+ representative is in control of that account) for him and
issue for him M- and M+ tokens to this wallet instead of his own wallet (and do trade/exchange
operations for him instead of himself). The amount of transfers/swaps may be restricted by using a
smart wallet as such a "bank account".

So, accordingly the above paragraph consider that task done (that pargraph is the "manual approval
process"):

> Create that protocol as a) manual approval process by an authorized member of the M+ governance team, and b) as an automatically executing smart contract.

## FAQ

**Which tokens do you have?**

M+ token is the retired carbon credits.

M- token is the non-retired carbon credits.

Each authority has also its own token for carbon credits that could be exchanged
for the token of its upper level issuer and ultimately for the M- token.

**There are both ERC-20 and ERC-1155 tokens. Which tokens should I use?**

Our ERC-20 tokens wrap corresponding ERC-1155 so that the amounts on accounts of
our ERC-20 and the corresponding ERC-1155 token are always equal. Transfer or approval
of one of these two tokens automatically transfers or approves also the other one.

You should use ERC-1155 tokens if you can, because they are both more secure (there
is a security bug in ERC-20 that affects for example crypto exchanges) and use less
gas. But many legacy softwares don't support ERC-1155, in this case use ERC-20.

## Sum of Several Tokens

_When starting to work on this bounty, I first overengineered: My system of summing
several tokens in fact protects only as much as the capacities of exchanges would
allow. So instead just issue several independent tokens and allow to exchange at a
limited rate the main token._

The code for sum of several tokens is slow, supports only a very small number of
issuers, and is not recommended to be used. Nevertheless I keep that code (and this
its description) in the repository for art and history of programming purposes.

It tackles the problem if once of the token issuing entities would be hijacked
by each of them having its own token. The M+C token is formed as a sum of values
of several tokens.

So, I create a child/parent tree of ERC-1155 tokens. To each parent balance the
sum of all its child balances is added.

When a parent token is transferred and its own balance is not enough, the
contract chooses its first child (among the tokens that the given user holds in
a non-zero amount) and transfers it (recursively). If its amount at a particular
user is not enough for the transfer, then the next token (among the tokens that
the given user holds in a non-zero amount) is transferred (recursively), etc.

The tokens that a given user holds in non-zero amounts are kept in a double linked
list. This avoids considering zero-amount tokens when doing a transfer (to improve
performance).

The above solves the cheating by one of the lower parties trouble, as allows removal
of a child token. However, if the hijacker or anyone else sells fake tokens at an
exchange, this security measure does not work. So it is recommended to trader to limit
their allocated funds at exchanges that they provide to exchange for my tokens to limit
the damage. When a hijacking is found, the hijacking token should be removed from the
list of children tokens ASAP to limit the damage.

The structure of the tree can be set only by the owner, because otherwise a malicious
issuer could make the tree big, so producing high gas consumption or even out-of-gas
errors.

## Other problems

Some DAOs cannot be ERC-1155 smart wallets (because ERC-1155 smart wallet must implement
certain functions that may be missing in a DAO). The trouble is solvable by making the DAO
to control a separate contract acting as a ERC-1155 smart wallet. Another solution is to
use my ERC-20 wrapper.

## See also

`doc/` folder. Use LibreOffice to read these files.

## Donations

If you find this project useful, donate:

- https://paypal.me/ViktorPorton
- https://www.patreon.com/porton
- BitCoin 174HGm3PfoxYZkx59hoxVseQZzW5KnCPij
- Ethereum 0x722cE03C15670c313f9596544CDB582c19f810e2
