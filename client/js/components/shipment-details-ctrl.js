import angular from 'angular';

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'ConfirmationModal', 'LoggedInUser', 'messageModal', 'navigate', 'palletCategories', 'sessionTimeout', 'ShipmentManagerSvc',
  function( ConfirmationModal, LoggedInUser, messageModal, navigate, palletCategories, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.shipment = {};

    vm.showEditControls = LoggedInUser.hasPermission('EDIT_INCOMING_SHIPMENT');
    vm.showReceiveControls = LoggedInUser.hasPermission('RECEIVE_INCOMING_SHIPMENT');
    vm.categoryOptions = [ "" ].concat( palletCategories );

    vm.editValue = {};
    vm.isEditing = {};
    vm.openEdit = key => {
      vm.isEditing[ key ] = true;
      vm.editValue[ key ] = vm.shipment[ key ];
    };
    vm.closeEdit = key => {
      vm.isEditing[ key ] = false;
      delete vm.editValue[ key ];
    };
    vm.saveEdit = key => {
      vm.isEditing[ key ] = false;
      let p; // will be set to a promise

      if( vm.editValue[ key ] !== vm.shipment[ key ] ) {
        p = ShipmentManagerSvc.editShipment( )( { [ key ]: vm.editValue[ key ] } )
          .then( resp => {
            if( resp.success ) {
              return vm.shipment[ key ] = vm.editValue[ key ]; 
            }
            else {
              throw new Error(resp.error);
            }
          })
          .catch( _e => {
            return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
          });
      }
      else {
        p = Promise.resolve( true );
      }

      p.then( _ => vm.closeEdit( key ) ); // close edit when done
    };

    /* eslint-disable angular/controller-as-vm */
    const registerPalletEditingHandlers = ( pallet ) => {
      pallet.openEdit = function( ) {
        this.editValues = JSON.parse( JSON.stringify( this ) );
        this.isEditing = true;
      };
      pallet.closeEdit = function( ) {
        this.isEditing = false;
        delete this.editValues;
      };
      pallet.saveEdit = function( ) {

        this.isEditing = false;
        let p;

        if( this.editValues.handle !== this.handle ||
            this.editValues.units !== this.units ||
            this.editValues.category !== this.category ) {

          p = ShipmentManagerSvc.editExpectedPallet()( this._id, this.editValues )
            .then( resp => {
              if( resp.success ) {
                return Object.assign( this, this.editValues );
              }
              else {
                throw new Error(resp.error);
              }
            })
            .catch( _e => {
              return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
            });

        }
        else {

          p = Promise.resolve( true );

        }

        p.then( _ => this.closeEdit() );
      };
    };
    /* eslint-enable */


    vm.receiveShipment = () => navigate.receiveShipment( ShipmentManagerSvc.getShipmentId() );

    vm.removeShipment = () => {

      ConfirmationModal.launch({ header: "Delete Shipment", body: "Really delete this shipment?" }).then( result => {
        if( result ) {
          return ShipmentManagerSvc.removeShipment().then( _ => {
            navigate.shipmentList();
          });
        }
      } );
    };

    const updateDocumentList = () => {

      ShipmentManagerSvc.listShipmentDocuments().then( documents => {

        if( documents ) {
          Object.assign( vm.shipment, { documents } );
        }

      });

    };

    vm.uploadDocument = function() {
      if(!vm.documentToUpload) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      const document = vm.documentToUpload;

      vm.waitingForResponse = true;
      ShipmentManagerSvc.uploadShipmentDocument()( document ).then( _ => {
        updateDocumentList();
        vm.waitingForResponse = false;
      });

    };

    vm.removeDocument = documentName => {
      ShipmentManagerSvc.removeShipmentDocument()( documentName ).then( _ => {
        updateDocumentList();
      });
    }
 
    const init = () => {
      ShipmentManagerSvc.loadShipment( ).then( shipment => {

        Object.assign(vm.shipment, shipment);

        vm.shipment.palletsExpected.forEach( p => registerPalletEditingHandlers(p) );

      });

      updateDocumentList();

    };

    // init the page
    init();
  }]);
