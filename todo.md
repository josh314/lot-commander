- there is no estimated retail value (ERV) without a manifest.
	- option for user to set ERV on a total or per unit basis
- "case-packed" lot type
- complaints about image uploading
	- multiple images (works in Chrome on Mac, though)
	- big images are not uploadable? (again, I uploaded a 9MB gif from Mac)
- clone listing incl.
	- images (don't copy image, just clone the filename)
	- manifest
		- actually clone this
		- remove quantities
- batch the upcItemDb requests when getting all the product data after lot submission
	- getting "too fast" warnings
- image collage-building widget
- load dependencies from my libraries via npm
- simplify logging: drop winston (and morgan?) and use console logging

# webpack migration
- /build/ng-app-server-data.js endpoint is clever, but inelegant
	- would be pretty to create and bundle this logic using webpack
		- requires better architecture of the db libraries (lot-db, inmar-db). want to export enums without having to make connections to the dbs
- switch to SASS
- bootstrap 4?
	- must use SASS
- move vendor code into node-modules
- linting 
- sort out dev/prod env variables
- clean out grunt dependencies
- move non-secret config info from config.js to webpack
	- folder locations, etc
- server app built from webpack?
- glyphicon fonts aren't making it in

# From Charles

Here are the primary use cases  needed for listing creation on lot commander

- Manifested Lot/Pallet
	- Title
	- Picture
	- Description
	- lot.handle
	- Value
	- Condition
	-  Manifest

- Non-manifested – Lot/Pallet
	- Title
	- Picture
	- lot.handle
	- Value
	- Condition
	- estimated retail value