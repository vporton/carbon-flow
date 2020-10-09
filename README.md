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

We have two "main tokens": the M+ tokens and the token M- to represent
non-retired credits. All issuers are direct or indirect children of the
main issuer (issuer for M-).

### Limiting token flow

The amount of child tokens that can be swapped for a parent token is limited
by an algorithm parametrized with the following numbers:

- C - max swap amount (a number of tokens);

- P - swap credit period (a number of seconds).

This is to avoid some entity maliciously or erroneously minting producing a
giant number of tokens and then swapping them for valuable parent token.

The idea is that one can swap up to C tokens per swap period P.

The algorithm is as follows:

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
