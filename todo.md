# usability and user-error mitigation
- prevent submitting lot without images

# Dev

- Do static-checking on server-side code
	- Use webpack
		- replace requires/module.exports with import/export
		- requires changes to deployment to run the bundled file
	- will allow more useful linting and checking for functions

# Dependencies
- The rule `angular/service-name` will be split up to different rules in the next version. Please read the docs for more information
- npm WARN deprecated angular-ui-router@0.4.3: This npm package 'angular-ui-router' has been renamed to '@uirouter/angularjs'. Please update your package.json. See https://ui-router.github.io/blog/uirouter-scoped-packages/
- npm WARN deprecated bcrypt-nodejs@0.0.3: bcrypt-nodejs is no longer actively maintained. Please use bcrypt or bcryptjs. See https://github.com/kelektiv/node.bcrypt.js/wiki/bcrypt-vs-brypt.js to learn more about these two options
- npm WARN deprecated hawk@3.1.3: This module moved to @hapi/hawk. Please make sure to switch over as this distribution is no longer supported and may contain bugs and critical security issues.
- npm WARN deprecated cryptiles@2.0.5: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).
- npm WARN deprecated boom@2.10.1: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).
- npm WARN deprecated sntp@1.0.9: This module moved to @hapi/sntp. Please make sure to switch over as this distribution is no longer supported and may contain bugs and critical security issues.
- npm WARN deprecated hoek@2.16.3: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).

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

- pricing
	- come up with something more sophisticated
		- suppress/remove outliers

- create user

- add user roles

- on view-lots page, watch for changes to images (new images or edits to existing images) and updsate display accordingly

- prevent submission of lot without images

- lots/list: 
	- remove create manifest file button if it's not being used (move to view-lot page if still in use)


# Facelift the UI
- Remove unnecessary features
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