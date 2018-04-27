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
			this.inventory = [];
			this._id = undefined;
			this.manifestId = undefined;
			this.status = dbEnums.lotStatus[0];
			this.listings = [];
			this.thirdPartyManifests = [];
		};
		this.reset();

		this.setHandle = function(_handle) { this.handle = _handle; };

		this.setDescription = function(_description) { this.description = _description; };

		this.setType = function(_type) { this.type = _type; };

		this.setInventory = function(_inventory) { this.inventory = _inventory; };

		this.setStatus = function(_status) { this.status = _status; };

		this.setListings = function(_listings) {this.listings = _listings; };

		this.setThirdPartyManifests = function(_thirdPartyManifests) {this.thirdPartyManifests = _thirdPartyManifests; };

		this.setTotalUnits = function(_totalUnits) { this.totalUnits = _totalUnits; };

		this.save = function(_lot) {
			this.reset();
			this.setHandle(_lot.handle);
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
			if(_lot.thirdPartyManifests) {
				this.setThirdPartyManifests(_lot.thirdPartyManifests);
			}
			if(_lot.totalUnits) {
				this.setTotalUnits(_lot.totalUnits);
			}
		}

		this.addInventory = function(newBarcode) {
			//search for product in this.inventory
			if(/[0-9]{8,15}/.test(newBarcode)) {
				var idx = this.inventory.findIndex(item => item.barcode == newBarcode);
				if(idx >= 0) {
					this.inventory[idx].quantity += 1;
				}
				else {
					const newItem = {
						barcode: newBarcode,
						quantity: 1
					};
					let iidx = this.inventory.findIndex(item => item.barcode > newItem.barcode);
					if (iidx >= 0)
						this.inventory.splice(iidx, 0, newItem);
					else
						this.inventory.push(newItem);
				}
				this.totalUnits += 1;
			}
		};

		this.getHandle = function() { return this.handle; };
		this.getInventory = function() { return this.inventory; };
		this.getDescription = function() { return this.description; };
		this.getType = function() { return this.type; };
		this.getStatus = function() { return this.status; };
		this.getListings = function() { return this.listings; };
		this.getThirdPartyManifests = function() { return this.thirdPartyManifests; };
		
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