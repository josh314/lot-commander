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