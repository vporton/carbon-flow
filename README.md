# Carbon Flow

It is a solution of
https://gitcoin.co/issue/MPlus4Climate/MPlusToolKit/1/100023834 bounty
(work in progress!)

The task was formulated to produce an ERC-20 token, but I do a ERC-1155 token.
The discrepancy is easily solvable by creating a ERC-1155/ERC-20 bridge.

## Installation

Prerequisites: Node.js, yarn.

To install:
```sh
yarn install
npx buidler deploy --network NETWORK
```
(replace `NETWORK` by `mainnet` when doing the real deployment, for testing you can
use `--network buidlerevm`).

To test:
```sh
yarn install
npx buidler test
```

## Kinds of tokens

There are basically two kinds of tokens:

- non-retired carbon tokens;

- retired carbon tokens.

Each token has a token owner. Each token has either a parent token or no parent token.

There are two "main tokens" (they have no parents):

- the M+ token represents retired carbon credits;
- the M- token represents non-retired carbon credits.

The token owner whose ultimate ancestor is the owner of M+ is called an _issuer_.

The token owner whose ultimate ancestor is the owner of M- is called an _carbon credit authority_.

So, we have two trees (there may be more, see the next paragraph): the tree of child/parent
relationships between issuers and the tree of child/parent relationships between carbon credit
authorities.

There may be token owners who are neither issuers not authorities (either tokens
unrelated with our carbon counting project (That's fine, there is no reason to use my project only
for carbon counting, it may be useful also for something other.) or token owners temporarily not having
M+ or M- as the ultimate ancestor).

A token owner can change its parent at any moment of time by its own will. (But
if he does this, his swap limits (see below) are reset to zero until its new parent wishes to
increase his limits.)

## Token flow

Anybody can swap a child token he holds for the same amount of its parent token.

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

## ERC-20 tokens

Our ERC-20 tokens wrap corresponding ERC-1155 so that the amounts on accounts of
our ERC-20 and the corresponding ERC-1155 token are always equal. Transfer or approval
of one of these two tokens automatically transfers or approves also the other one.

_Our ERC-20 tokens have a bug (do not fully conform to the ERC-20 standard):_
the system is not notified of ERC-1155 transfers and other events by the corresponding
ERC-20 events.

TODO: Should completely remove all events from the ERC-20 wrapper, because they
don't happen reliably anyway (happen but not on every transfer)?

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

See also `TODO` and `FIXME` comments in the source.

Lint Solidity.

### Not doable things

The bounty required
_Create 10.000 carbon credit serial numbers, including a marker to identify them as “retired”_.
That's a nonsense, because a carbon credit may be retired partially, so it makes no sense to
mark it either as retired or non-retired.

## FAQ

**Which tokens do you have?**

M+ token is the retired carbon credits.

M- token is the non-retired carbon credits.

Each issuer and each authority has also its own token for carbon credits that could be exchanged
for the token of its upper level issuer and ultimately for the M+ or M- token.

**There are both ERC-20 and ERC-1155 tokens. Which tokens should I use?**

Our ERC-20 tokens wrap corresponding ERC-1155 so that the amounts on accounts of
our ERC-20 and the corresponding ERC-1155 token are always equal. Transfer or approval
of one of these two tokens automatically transfers or approves also the other one.

You should use ERC-1155 tokens if you can, because they are both more secure (there
is a security bug in ERC-20 that affects for example crypto exchanges) and use less
gas. But many legacy softwares don't support ERC-1155, in this case use ERC-20.

**Can M+/M- tokens owner mint directly?**

Non-retired (M-) tokens can be minted only through the authority mechanism.

The current implementation allows to mint M+ tokens by the Global Community Fund.
TODO: Probably this should be disabled (by changing the program source before the
final release).

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

## See also

`doc/` folder. Use LibreOffice to read these files.

## Donations

If you find this project useful, donate:

- https://paypal.me/ViktorPorton
- https://www.patreon.com/porton
- BitCoin 174HGm3PfoxYZkx59hoxVseQZzW5KnCPij
- Ethereum 0x722cE03C15670c313f9596544CDB582c19f810e2