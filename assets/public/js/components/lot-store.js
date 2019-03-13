(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/****************** Lot store *****************************/
	//Constructor function for lotStore service
	function LotStore(dbEnums) {
		this.reset = function() {
			this.handle = undefined;
			this.description = undefined;
			this.type = undefined;
			this.totalUnits = 0;
			this.unmanifested = false;
			this.inventory = [];
			this._id = undefined;
			this.manifestId = undefined;
			this.status = dbEnums.lotStatus[0];
			this.listings = [];
			this.listingData = {};
			this.thirdPartyManifests = [];
			this.submittedListings = [];
			this.destinationMarketplace = undefined;
		};
		this.reset();

		this.setHandle = function(_handle) { this.handle = _handle; };

		this.setDescription = function(_description) { this.description = _description; };

		this.setType = function(_type) { this.type = _type; };

		this.setInventory = function(_inventory) { this.inventory = _inventory.map(i=> i.quantity<0 ? Object.assign(i,{quantity:0}) : i ); };

		this.setStatus = function(_status) { this.status = _status; };

		this.setListings = function(_listings) {this.listings = _listings; };

		this.setListingData = function(_listingData) {this.listingData = _listingData; };

		this.setThirdPartyManifests = function(_thirdPartyManifests) {this.thirdPartyManifests = _thirdPartyManifests; };

		this.setTotalUnits = function(_totalUnits) { this.totalUnits = _totalUnits; };

		this.setSubmittedListings = function(_listings) {this.submittedListings = _listings; };

		this.setDestinationMarketplace = function(_destinationMarketplace) { this.destinationMarketplace = _destinationMarketplace; };

		this.updateTotalUnits = ()=>{ this.totalUnits = this.inventory ? this.inventory.reduce((sum,item) => sum + parseInt(item.quantity), 0) : 0 }

		this.save = function(_lot) {
			this.reset();
			this.setHandle(_lot.handle);
			this.unmanifested = _lot.unmanifested;
			if(_lot.description) {
				this.setDescription(_lot.description);
			}
			if(_lot.type) {
				this.setType(_lot.type);
			}
			if(_lot.inventory) {
				this.setInventory(_lot.inventory);
			}
			if(_lot._id) {
				this._id = _lot._id;
			}
			if(_lot.manifestId) {
				this.manifestId = _lot.manifestId;
			}
			if(_lot.status) {
				this.setStatus(_lot.status);
			}
			if(_lot.listings) {
				this.setListings(_lot.listings);
			}
			if(_lot.listingData) {
				this.setListingData(_lot.listingData);
			}
			if(_lot.thirdPartyManifests) {
				this.setThirdPartyManifests(_lot.thirdPartyManifests);
			}
			if('totalUnits' in _lot) {
				this.setTotalUnits(_lot.totalUnits);
			}
			if(_lot.submittedListings) {
				this.setSubmittedListings(_lot.submittedListings);
			}
			if(_lot.destinationMarketplace) {
				this.setDestinationMarketplace(_lot.destinationMarketplace);
			}
		}

		// this.addInventory = function(newBarcode) {
		// 	//search for product in this.inventory
		// 	let item;
		// 	if(!newBarcode) {
		// 		item = { quantity: 0 };
		// 		this.inventory.push(item);
		// 	}
		// 	else if(/[0-9]{8,15}/.test(newBarcode)) {
		// 		item = this.getInventoryItemByBarcode(newBarcode);
		// 		if(item) {
		// 			item.quantity += 1;
		// 		}
		// 		else {
		// 			item = {
		// 				barcode: newBarcode,
		// 				quantity: 1
		// 			};
		// 			let iidx = this.inventory.findIndex(i => i.barcode > item.barcode);
		// 			if (iidx >= 0)
		// 				this.inventory.splice(iidx, 0, item);
		// 			else
		// 				this.inventory.push(item);
		// 		}
		// 		this.totalUnits += 1;
		// 	}
		// 	return item;
		// };

		this.addInventory = function(newBarcode) {
			let item;
			if(!newBarcode) {
				item = { quantity: 0 };
			}
			else if(/[0-9]{8,15}/.test(newBarcode)) {
				const idx = this.inventory.findIndex(i => i.barcode == newBarcode);
				if(idx>=0) {
					item = this.inventory[idx];
					item.quantity += 1;
					this.inventory.splice(idx, 1);
				}
				else {
					item = {
						barcode: newBarcode,
						quantity: 1
					};
				}
				this.totalUnits += 1;
			}
			this.inventory = [item].concat(this.inventory);
			return item;
		};

		this.getHandle = function() { return this.handle; };
		this.getInventory = function() { return this.inventory; };
		this.getDescription = function() { return this.description; };
		this.getType = function() { return this.type; };
		this.getStatus = function() { return this.status; };
		this.getListings = function() { return this.listings; };
		this.getListingData = function() { return this.listingData; };
		this.getThirdPartyManifests = function() { return this.thirdPartyManifests; };
		this.getDestinationMarketplace = function() { return this.destinationMarketplace; };

		this.getInventorySortedByBarcode = function() {
			// Going through these gymnastics since Array.sort() is an inplace action

			// get a new array composed just of the sorting values and their original array indices
			const mapped = this.inventory.map((item,i) => { return { index: i, value: item.barcode }; });

			// inplace sort new array
			mapped.sort(function(a, b) {
			  if (a.value > b.value) {
			    return 1;
			  }
			  if (a.value < b.value) {
			    return -1;
			  }
			  return 0;
			});

			// Use the new sorted array of indices to traverse the original array
			return mapped.map(e => this.inventory[e.index]);
		};

		this.getInventoryItemByBarcode = function(barcode) {
			return this.inventory.find(item => item.barcode == barcode);
		}
		
		this.getInventoryTotal = function() {
			return this.inventory.reduce((acc,val) => {return acc + val.quantity;}, 0);
		};

		this.getNumSku = function() { return this.inventory.length; };

		this.decrementInventory = function(barcode) {
			var idx = this.inventory.findIndex(item => item.barcode == barcode);
			if(idx >= 0) {
				if(this.inventory[idx].quantity > 1) {
					this.inventory[idx].quantity -= 1;
					if(this.inventory[idx].validated == this.inventory[idx].quantity + 1) {
						this.inventory[idx].validated -= 1;
					}
				}
				else {
					this.inventory.splice(idx,1);
				}
				this.totalUnits -= 1;
			}
		};

		this.deleteProduct = function(barcode) {
			var idx = this.inventory.findIndex(item => item.barcode == barcode);
			if(idx >= 0) {
				this.totalUnits -= this.inventory[idx].quantity;
				this.inventory.splice(idx,1);
			}
		};

	}
	app.service('lotStore', ['dbEnums', LotStore]);//register service
})();