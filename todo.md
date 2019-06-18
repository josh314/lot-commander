# Bugs
- complaints about image uploading
	- multiple images (works in Chrome on Mac, though)
	- big images are not uploadable? (again, I uploaded a 9MB gif from Mac)
- the "login/logout" bug
	- keeps logging out and logging back in
		- this is just when the ignore login rule is on?
- login page is calling for stylesheet app.css but is just getting login page back since not yet logged in
	- no real damage but does throw an annoying error in browser console
- [?] no auctions were being listed in production at /auctions/list
- (node:47412) UnhandledPromiseRejectionWarning: Error: Error: InvalidBucketName: The specified bucket is not valid.
    at deleteLot (/Users/josh/dev/apps/lot-commander/modules/lot-db.js:206:11)
    at <anonymous>
    at process._tickDomainCallback (internal/process/next_tick.js:229:7)
- not exactly a bug but should hide or disable scan button on list lots page for unmanifested lots

# Warnings
- on startup
	- objc[47477]: Class GNotificationCenterDelegate is implemented in both /Users/josh/dev/apps/lot-commander/node_modules/sharp/vendor/lib/libgio-2.0.0.dylib (0x1119db578) and /Users/josh/dev/apps/lot-commander/node_modules/canvas/build/Release/libgio-2.0.0.dylib (0x116b50578). One of the two will be used. Which one is undefined.
- uploading image on lot page (before unlinking temp file)
	- (node:47610) DeprecationWarning: Mongoose: `findOneAndUpdate()` and `findOneAndDelete()` without the `useFindAndModify` option set to false are deprecated. See: https://mongoosejs.com/docs/deprecations.html#-findandmodify-
- removing image from view lot page
	- (node:49351) DeprecationWarning: Mongoose: `findOneAndUpdate()` and `findOneAndDelete()` without the `useFindAndModify` option set to false are deprecated. See: https://mongoosejs.com/docs/deprecations.html#-findandmodify-
- (node:47412) DeprecationWarning: collection.remove is deprecated. Use deleteOne, deleteMany, or bulkWrite instead.
	- was this from delete Lot function?

# Features
- there is no estimated retail value (ERV) without a manifest.
	- option for user to set ERV on a total or per unit basis
- clone listing function. Include:
	- images (don't copy image, just clone the filename)
	- manifest
		- actually clone this
		- remove quantities
- image collage-building widget
- image editing
	- clean up UI
		- spacing between buttons
		- window sizes
	- features
		- resizing 
		- orientation
- Scanning page: Increase the size for the fonts for “Inventory count 00” and make this obvious to users. We are still having issues of knowing if the item in hand was scanned. I will try to enforce reading but can’t make promises on projected success.
- Scanning page: Please add audible feedback for scanning. Good sound for UPC accepted bad sound for errors. This will help keep user attention on the screen or identify run away problems sooner.
- Scanning page: Please enhance the size of the item Quantity toggle button. You may want to consider making it +/- .  This will help people that are less familiar with computers and working with the software.
- pricing
	- come up with something more sophisticated
		- suppress/remove outliers
- "case packed" option for condition
	- need a lot-type indicator on wholesale ninjas
- Creating Listing Page: Automatically make the lot price 20% of the retail value. This will remove decision making.
- create user
- add user roles
- on view-lots page, watch for changes to images (new images or edits to existing images) and updsate display accordingly
- prevent submission of lot without images

# S3 Image server
- deploy
	- update all dependencies
- convert stuff to use S3
	- images.downloadImages
- permissions
	- public read access to the objects
	- no public access to bucket itself
- key policy
	- file name is maybe not good
	- some kind of hash

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