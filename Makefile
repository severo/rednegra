all: build

# Install dependencies
node_modules:
	npm install

install: node_modules

build: install
	npm run build

serve:
	npm run dev

# .SECONDARY with no dependencies marks all file targets mentioned in the makefile as secondary.
.SECONDARY:

# -- Clean

# Clean tmp
clean:
	rm -rf _site
