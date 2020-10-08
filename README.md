# Carbon Flow

It is a solution of
https://gitcoin.co/issue/MPlus4Climate/MPlusToolKit/1/100023834 bounty
(work in progress!)

The task was formulated to produce an ERC-20 token, but I do a ERC-1155 token.
The discrepancy is easily solvable by creating a ERC-1155/ERC-20 bridge.

## Token flow

I will use the word _issuer_ to denote issuer of retired carbon credits.

The issuers are structured into child/parent relationships. Some issuers
have no parent. One of the issuers is _primary_, it is the issuer or the
main M+ token. Other issuers may have no parent, too, for example temporarily
have no parent. (An issuer can change its parent at any moment of time by its
own will.)

Each issuer has its own token. (Tokens of several issuers may be the same.)

Anybody can swap a child issuer token he holds for the same amount of its
parent issuer token. The swap operation swaps the _entire amount_ of
these child tokens he has. (TODO: Should be able to swap a part.)

### Limiting token flow

The amount of child tokens that can be swapped for a parent token is limited
by a certain number of tokens per second (as determined by the time since).

This is to avoid some entity maliciously or erroneously minting producing a
giant number of tokens and then swapping them for valuable parent token.

Morevover there is swap credit, a certain number of tokens that can be swapped
in addition to the above defined amount. The swap credit is allocated as soon
as the last allocated (by overusing the ?? limit) swap credit expires (it expires
when the time equal to swap credit divided to the limit of token per second
passes).

Swap credit is intended for the situation when somebody swapped a token very
recently and the allocated number of tokens is too small, as otherwise anyone
would be able to hijack the system by swapping often.

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

## TODO

`TokensFlow` - If overflowed then transfer nothing?

Test `TokensFlow` transfer limits.
