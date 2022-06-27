This is carbon tokens with anti-theft (WIP: Need to resolve some bugs in third-party software and then add the possibility of
holographic consensus for global DAO votings):

Carbon thieves exist: I was not paid $1000 for [this project](https://gitcoin.co/issue/mplus4climate/mplustoolkit/1/100023834) by Ingo Puhl (I consider him a disappeared criminal.) from South Pole and $500 by Houston Impact Hub. So every time I do a climate project, I was stolen, total $1500.

Using ERC-1155 anyone can create a carbon token.

Between tokens they can be set child/parent relationships (e.g. child is Paris, parent is France)
with the parent being able to set maximum (total or per time period) exchanges of child token to
parent token, to prevent unlimited theft by minting much child token. Parent can also disable
exchange from child altogether.

The exchange rate (as determined from amounts of carbon known to be stolen or otherwise mis-minted) can
be set using `ExchangeRateSetter` contract.

`ExchangeRateSetter` allows anyone to set exchange rate coefficient for exchange of child to parent
token from a ChainLink feed.

`ExchangeRateSetter` is a proxy contract: It forwards control operations to the actual token contract.

To use it you should set the owner of a token to an instance `ExchangeRateSetter`.

Among other operations `setOwner` is forwarded, so if you have set
the owner of a token to an instance `ExchangeRateSetter` and change your mind, you can set another
owner.