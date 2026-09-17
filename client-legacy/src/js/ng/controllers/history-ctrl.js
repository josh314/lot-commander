import angular from 'angular';
import * as DisplayEvents from '../../display-events';

/******************* History Controller *************************/
angular.module('myApp').controller('HistoryCtrl', [ 'EventsSvc',
  function( EventsSvc ) {
    const vm = this;

    EventsSvc.getEvents().then( events => {
      vm.events = events.map( ev => {

        const classes = {
          'create-incoming-shipment': DisplayEvents.CreateIncomingShipment,
          'remove-incoming-shipment': DisplayEvents.RemoveIncomingShipment,
          'edit-incoming-shipment': DisplayEvents.EditIncomingShipment,
          'receive-incoming-shipment': DisplayEvents.ReceiveIncomingShipment,
          'unreceive-incoming-shipment': DisplayEvents.UnreceiveIncomingShipment,
          'receive-incoming-shipment-pallet': DisplayEvents.ReceiveIncomingShipmentPallet,
          'close-incoming-shipment': DisplayEvents.CloseIncomingShipment,
          'reopen-incoming-shipment': DisplayEvents.ReopenIncomingShipment,
        };

        const _class = classes[ ev.type ] || DisplayEvents.Base;

        return new _class( ev );

      });
    });

  }
]);
