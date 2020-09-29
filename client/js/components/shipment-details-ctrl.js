import angular from 'angular';

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'LoggedInUser', 'messageModal', 'navigate', 'sessionTimeout', 'ShipmentManagerSvc',
  function( LoggedInUser, messageModal, navigate, sessionTimeout, ShipmentManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

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
        p = ShipmentManagerSvc.editShipment( )( { handle: vm.editValue[ key ] } )
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

    const init = () => {
      ShipmentManagerSvc.loadShipment( ).then( shipment => {
        vm.shipment = shipment;
      });
    };

    // init the page
    init();
  }]);
