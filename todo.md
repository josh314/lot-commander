# Bugs
- complaints about image uploading
	- multiple images (works in Chrome on Mac, though)
	- big images are not uploadable? (again, I uploaded a 9MB gif from Mac)
- the "login/logout" bug
	- keeps logging out and logging back in
		- this is just when the ignore login rule is on?

# Feature requests
- there is no estimated retail value (ERV) without a manifest.
	- option for user to set ERV on a total or per unit basis
- clone listing incl.
	- images (don't copy image, just clone the filename)
	- manifest
		- actually clone this
		- remove quantities
- image collage-building widget
- image editting (cropping, resizing, orientation)
- Lot Creation page: When creating a new lot which is manifested once the user presses the “create” button please have the navigation take the user to the page to begin scanning for the lot created. If the lot is un-manifested have the system take the user to the lot page which is being created.
- Scanning page: Increase the size for the fonts for “Inventory count 00” and make this obvious to users. We are still having issues of knowing if the item in hand was scanned. I will try to enforce reading but can’t make promises on projected success.
- Scanning page: Please add audible feedback for scanning. Good sound for UPC accepted bad sound for errors. This will help keep user attention on the screen or identify run away problems sooner.
- Scanning page: Please enhance the size of the item Quantity toggle button. You may want to consider making it +/- .  This will help people that are less familiar with computers and working with the software.
- Pricing: remove the 20% added value to pricing. Maybe test an average price behind the scenes to see if that normalizes the price. Have the price for items with no data be an average of the other items in the lot. This will save time when listing because we are having to revise the price of 50% of items in the manifest by hand.
- Condition: Please add a "case packed" option for condition. We have tested it and customers like case packed stuff and they are willing to pay more.
	- need a lot-type indicator on wholesale ninjas
- Creating Listing Page: Automatically make the lot price 20% of the retail value. This will remove decision making.
- create user
- add user roles

# Facelift the UI
- Remove unnecessary features
	- quick lots
	- auctions(?)
	- manifests pages

# non-critical
- /build/ng-app-server-data.js endpoint is clever, but inelegant
	- would be pretty to create and bundle this logic using webpack
		- requires better architecture of the db libraries (lot-db, inmar-db). want to export enums without having to make connections to the dbs
- switch to SASS
- bootstrap 4?
	- must use SASS
- sort out dev/prod env variables
- move non-secret config info from config.js to webpack
	- folder locations, etc
- server app built from webpack?
- turn back on angular linting rules one-by-one (or configure to liking)
	- angular/controller-as
	- angular/controller-name
	- angular/definedundefined
	- angular/json-functions
	- angular/log
	- angular/module-getter
	- angular/module-setter
	- angular/no-service-method
	- angular/on-watch******
- move webpack and other deps to devDependencies
	- source control /dist
	- gitlab commit hook to build /dist?
- load dependencies from my libraries via npm
- simplify logging: drop winston (and morgan?) and use console logging
- batch the upcItemDb requests when getting all the product data after lot submission
	- getting "too fast" warnings

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