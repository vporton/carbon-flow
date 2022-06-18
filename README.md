# Carbon Flow

**Help needed!** - see at the bottom.

`manyfunds` branch contains improved API, but this new branch is not yet tested.

_This is **the only** reasonable carbon accounting project for the world, because it has world-best anti-theft protection to scale to store and transfer trillions dollars of value. Carbon thieves exist: I was not paid $1000 for [this project](https://gitcoin.co/issue/mplus4climate/mplustoolkit/1/100023834) by Ingo Puhl (I consider him a disappeared criminal.) from South Pole and $500 for [this](https://gitcoin.co/issue/mplus4climate/mplustoolkit/1/100023834). So every time I do a climate project, I was stolen, total $1500.

The project is in desperate need of a few thousand dollars to pay to a certified error-checker. We also need to finish development of carbon accounting by creating an UI (a site) for accounters. Donate: 
https://gitcoin.co/grants/177/social-charity-tokens-and-dao-carbon-accounting

See also [this repository](https://github.com/vporton/courts) for the frontend UI. But better to use DAOstack voting system to create this site.

For big amounts of carbon, this software can be installed on Ethereum, for energy-efficient accounting of small amounts it can be used xDAI blockchain.

Demo (switch to Ropsten network):
https://arweave.net/-hwwwN8tPm0CrnW8Bn1NH24SrDnuShQOX7ZQ8M3JSig

See also https://youtu.be/R8q0rlrQqQc

![Screenshot](https://raw.githubusercontent.com/vporton/carbon-flow/main/doc/screenshot.png "Screenshot")

It is a ERC-1155 token. I have wrappers to convert it to ERC-20.

## Installation

Prerequisites: Node.js, yarn, GNU make.

To install contracts:
```sh
yarn install
GLOBAL_COMMUNITY_FUND=0x<THE-DAO-CONTRACT-ADDRESS> npx buidler deploy --network NETWORK
```
(replace `NETWORK` by `mainnet` (or another network we will choose later) when doing
the real deployment, for testing you can use `--network buidlerevm`).

## Testing

### Testing smart contracts

```sh
yarn install
npx buidler test
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

Each non-retired token may have a token owner. Each token has either a parent token or no parent token.

The token owner is called an _carbon credit authority_.

So, we have the tokens _and_ a tree of tokens of child/parent
relationships between authorities rooting in non-retired tokens with no parents (there may be more, see the next paragraph).

Remark: In fact they are not trees but directed graphs.

There may be token owners who are not authorities (either tokens
unrelated with our carbon counting project (That's fine, there is no reason to use my project only
for carbon counting, it may be useful also for something other.)

A token owner can change its parent at any moment of time by its own will. (But
if he does this, his token is disabled (unless now has no parent) and his swap limits
(see below) are reset to zero until its new parent wishes to increase his limits.)

TODO: Maybe we instead should have many-to-many child-parent relationship,
with child enabling/disabling and parent setting limits?
See also **Backward flow**

## Token flow

Anybody can swap a child token he holds for an amount (by an exchange rate set by parent) of its parent token.

It is useful to build a hieararchical system of authorities with roots in international carbon tokens.

### Backward flow

It is also useful to swap parent token back for its child tokens.

First, we can't make this operation impossible because the DAO (or other entity) controlling
a child token can "eat" parent tokens and mint according value of child tokens.

So, the remaining issue is whether we should make impossible for a DAO to avoid swapping parents
for childs.

The answer is "no", it should be always possible. The reason is the following: If the parent token
is a carbon credits token, then disabling its swapping for a child would somehow devalue carbon
credits what is clearly bad for the environment. So we should make swapping always possible.

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

There is also possible to set a single (not recurring) flow limit, that just decreases
with every eligible transfer.

In the case if somebody needs to exceed a swap credit amount for a legitimate
reason he may write an email to the parent token owner asking to raise the limits.

### Measures for theft recovery

I will use the word _theft_ to denote both malignant generation of tokens and generating
too big number fo tokens by mistake.

Any authority token can be disabled.

Anyone upward in the tree can disable any of its descendants.

Disabled authority cannot create credits, disabled tokens cannot be exchanged to parent
tokens.

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

There are two bridges built on different principles. `ERC20OverERC1155.sol` has a bug
but `ERC20LockedERC1155.sol` doesn't (so I recommend to use it).

`ERC20LockedERC1155.sol`

It converts tokens from ERC-1155 to ERC-20 and back with special contract calls.
In fact it is a simple DEX.

`ERC20OverERC1155.sol`

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

Documentation comments in contracts.

Test batch transfers.

See also `TODO` and `FIXME` comments in the source.

Improve solhint rules.

Add freely mintable tokens. It is useless for carbon, but useful for other applications.

### Manual approval process

If somebody wants to operate in the system without having an Ethereum account, an authority
may arrange for him for somebody to hold a wallet with a private key (or a smart wallet, e.g. a DAO
if the money hold a big to be sure not one M+ representative is in control of that account) for him and
issue for him M- and M+ tokens to this wallet instead of his own wallet (and do trade/exchange
operations for him instead of himself). The amount of transfers/swaps may be restricted by using a
smart wallet as such a "bank account".

## FAQ

**Which tokens do you have?**

Anybody can create his own two tokens:

- non-retired carbon credits.
- retired carbon credits.

Each authority has its own token for carbon credits that could be exchanged
for the token of its upper level issuer and ultimately for international tokens.

**There are both ERC-20 and ERC-1155 tokens. Which tokens should I use?**

Our ERC-20 tokens wrap corresponding ERC-1155 so that the amounts on accounts of
our ERC-20 and the corresponding ERC-1155 token are always equal. Transfer or approval
of one of these two tokens automatically transfers or approves also the other one.

You should use ERC-1155 tokens if you can, because they are both more secure (there
is a security bug in ERC-20 that affects for example crypto exchanges) and use less
gas. But many legacy softwares don't support ERC-1155, in this case use ERC-20.

## Other problems

Some DAOs cannot be ERC-1155 smart wallets (because ERC-1155 smart wallet must implement
certain functions that may be missing in a DAO). The trouble is solvable by making the DAO
to control a separate contract acting as a ERC-1155 smart wallet. Another solution is to
use (one of the three of) my ERC-20 wrappers.

Voting with balance of my tokens is impossible: Somebody could vote, transfer to another account
and vote again (many times). It could be made by storing the token balance (as in MiniMeToken)
at the beginning of the vote period, but that requires complex code and rather much gas
(electricity, carbon) usage on every transfer of. As a cheaper and easier alternative
solution I propose to vote not with balances of tokens but instead transfer the voted
amount of such a token to the fund's account (as a side effect, we get more donations). Note also that
this solution has a deciency: With quadratic voting it becomes possible for spoofers to transfer
little amounts of it to many of their friends and ask them to vote for them. Maybe we should give
up quadratic voting and use old-school linear voting?

If you set your swap limit to N and later make it M, then (surprise!) a hacker sometimes
[can send](https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/edit)
N+M tokens. This is a hard to deal with trouble. So, I just recommend the following to frontend developers: Set new swap
limit only when the previous one has almost emptied or expired, and do only set a new swap limit
when a recurring swap limit (if now the limit is recurring) is near to expiration (but no too near
because otherwise the new period may start before your transaction to set the new swap limit
confirms). Alternatively, you can set your swap limit to (non-recurring) low enough value before
setting the actual new value for a swap limit (this however creates an inconvenience for users, as
during some time they will be unable to swap). A radical solution would be to set swap limit to be
calculated as a sum of several (e.g. two) values that could be set independently. But that would
harden the system somehow.

## Advice

Quadratic voting anti-sybill can be done by using Fuse.io network and GoodDollar private keys as the
keys for voting. A user of GoodDollar would not give to somebody other his private key easily because
the key costs money. So it is a good anti-sybill. As a consequence, we should think of deploying our
entire system on Fuse. Another alternative would be Matic.

Note that GoodDollar identity is also deloyed on Ethereum mainnet, so we could just as well use mainnet,
but currently mainnet transactions are too costly. Transfers of M+ may have more harm to the environment
than good (but in the future Ethereum transactions cost is expected to come down much due to ETH2 project.)

## See also

`doc/` folder (outdated). Use LibreOffice to read these files.

## Donations

If you find this project useful, donate:

- https://paypal.me/ViktorPorton
- https://www.patreon.com/porton
- BitCoin 174HGm3PfoxYZkx59hoxVseQZzW5KnCPij
- Ethereum and other: https://gitcoin.co/grants/177/social-charity-tokens-and-dao-carbon-accounting

## Help needed

I tried to integrate holographic consensus from https://github.com/ajsantander/hc
but failed to compile that package. Can anyone with good Node.js skills help?

I want to change that package to vote not just by locking tokens but by paying in
tokens: this will help to spend less carbon on voting than teh voting saves.