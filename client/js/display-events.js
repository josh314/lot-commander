
export class Base {
  constructor( eventData ) {

    this.timestamp = eventData.createdAt.toLocaleString();

    this.showDetails = false;

    this.details = {
      'Event ID': eventData._id,
      'Event Type': eventData.type
    };

    if( eventData.user ) {

      if( eventData.user.firstName && eventData.user.lastName ) {
        this.details['User'] = `${eventData.user.firstName} ${eventData.user.lastName}`;
      }
      else if( eventData.user.firstName ) {
        this.details['User'] = eventData.user.firstName;
      }
      else if( eventData.user.lastName ) {
        this.details['User'] = eventData.user.lastName;
      }

      this.details.Username = eventData.user.username;

    }

  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

}

export class IncomingShipment extends Base {
  constructor( eventData ) {

    super( eventData );

    if( eventData.shipment ) {
      this.details['Shipment ID'] = angular.isObject(eventData.shipment) ? eventData.shipment._id : eventData.shipment;
    }

  }
}

export class CreateIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Created shipment';

  }
}

export class RemoveIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Removed shipment';

  }
}

export class EditIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = `Edited <b>${eventData.path}</b> field`;

    Object.assign(
      this.details,
      {
        'Old value': eventData.oldValue,
        'New value': eventData.newValue
      }
    );

  }
}

export class ReceiveIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Marked shipment as received';

  }
}

export class UnreceiveIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Unmarked shipment as recieved';

  }
}

export class ReceiveIncomingShipmentPallet extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    if( angular.isObject(eventData.shipment) ) {
      const found = eventData.shipment.palletsReceived.find( rp => rp._id == eventData.pallet );
      if( found ) {
        this.message = `Received pallet <b>${found.handle}</b>`;
        this.details['Pallet ID'] = found._id;
      }
    }

    if( !this.message ) {
      this.message = 'Received pallet';
    }

  }
}

export class CloseIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Closed shipment';

  }
}

export class ReopenIncomingShipment extends IncomingShipment {
  constructor( eventData ) {

    super( eventData );

    this.message = 'Re-opened shipment';

  }
}
