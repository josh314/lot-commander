(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/****************** Lot store *****************************/
	//Constructor function for lotStore service
	function LotStore() {
		this.reset = function() {
			this.handle = undefined;
			this.description = undefined;
			this.inventory = [];
			this._id = undefined;
			this.manifestId = undefined;
		};
		this.reset();

		this.setHandle = function(_handle) { this.handle = _handle; };

		this.setDescription = function(_description) { this.description = _description; }

		this.setInventory = function(_inventory) { this.inventory = _inventory; }

		this.save = function(_lot) {
			this.reset();
			this.setHandle(_lot.handle);
			if(_lot.description) {
				this.setDescription(_lot.description);
			}
			if(_lot.inventory) {
				this.inventory = _lot.inventory;
			}
			if(_lot._id) {
				this._id = _lot._id;
			}
			if(_lot.manifestId) {
				this.manifestId = _lot.manifestId;
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
			}
		};

		this.getHandle = function() { return this.handle; };
		this.getInventory = function() { return this.inventory; };
		this.getDescription = function() { return this.description; };

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
			}
		};

		this.deleteProduct = function(barcode) {
			var idx = this.inventory.findIndex(item => item.barcode == barcode);
			if(idx >= 0) {
				this.inventory.splice(idx,1);
			}
		};

	}
	app.service('lotStore', [LotStore]);//register service
})();