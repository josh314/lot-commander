import angular from 'angular';

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'LoggedInUser', 'messageModal', 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function( LoggedInUser, messageModal, navigate, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.shipment = {};

    vm.showEditControls = LoggedInUser.hasPermission('EDIT_INCOMING_SHIPMENT');
    vm.showReceiveControls = LoggedInUser.hasPermission('RECEIVE_INCOMING_SHIPMENT');

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

    vm.receiveShipment = () => navigate.receiveShipment( ShipmentManagerSvc.getShipmentId() );

    vm.removeShipment = () => {
      return ShipmentManagerSvc.removeShipment().then( _ => {
        //TODO: messageModal check
        navigate.shipmentList();
      });
    };

    const updateDocumentList = () => {

      ShipmentManagerSvc.listShipmentDocuments().then( documents => {console.log(documents)

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

      // TDO: waiting graphic/popup?
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
      });

      updateDocumentList();

    };

    // init the page
    init();
  }]);
