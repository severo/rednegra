all: build

# Install dependencies
node_modules:
	npm install

install: node_modules

build: install
	npx @11ty/eleventy --input=src --output=_site

serve:
	npx @11ty/eleventy --input=src --output=_site --serve

# .SECONDARY with no dependencies marks all file targets mentioned in the makefile as secondary.
.SECONDARY:

# -- Clean

# Clean tmp
clean:
	rm -rf _site
