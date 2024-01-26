#!/usr/bin/make -f

.PHONY: all ui ui-quick browserify compile doc

# all: ui doc
all: doc

# ui: ui-quick compile
# 	make out/ui/artifacts/mewconnect.js

# ui-quick:
# 	-rm -rf out/ui
# 	mkdir -p out/ui
# 	make out/ui/artifacts/addresses.js out/ui/artifacts/Carbon.abi out/ui/artifacts/ERC20Locked.abi
# 	find ui -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.abi" -o -name "*.png" -o -name "*.jpg" -o -name .htaccess | \
# 	  xargs cp --parents -t out/

compile:
	npx buidler compile

# out/artifacts/mewconnect.js: node_modules/@myetherwallet/mewconnect-web-client/dist/index.js
# 	npx browserify -o $@ -r ./$<:mewconnect

# out/ui/artifacts/%: out/artifacts/%
# 	mkdir -p out/ui/artifacts
# 	cp $< $@

doc: doc/tree.pdf

%.pdf: %.odg
	libreoffice --convert-to pdf --outdir $(dir $<) $<