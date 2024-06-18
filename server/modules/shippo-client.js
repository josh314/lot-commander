const axios = require('axios');
const qs = require('querystring');

/**********************************************
 * Helpers & Constants
 * ===================
 *
 ******/

const BASE_URL = 'https://api.goshippo.com/';

const weightUnit2MassUnit = {
  "pounds": "lb",
  "ounces": "oz",
  "grams": "g",
  "kilograms": "kg"
}

const lengthUnit2DistanceUnit = {
  "inches": "in",
  "feet": "ft",
  "centimeters": "cm"
}

function dimensionalItem2Parcel( item ) {

  let distanceUnits;

  if( item.lengthUnits === item.widthUnits && item.widthUnits === item.heightUnits ) {
    distanceUnits = item.lengthUnits;
  }


// TODO: make sure all linear dims are same units or convert them


  return {
    weight: item.weight,
    mass_unit: weightUnit2MassUnit( item.weightUnits ),
    length: item.length,
    width: item.width,
    height: item.height,
    distance_unit: lengthUnit2DistanceUnit( distanceUnits )
  };

}

/**********************************************
 * Shippo API Client
 * =================
 *
 ******/


class Client {

  constructor( {
    apiToken,
// TODO: instead of setting the address at instantiation, use live DB data
    address
  } ) {

    this.authHeader = {
      'Authorization': `ShippoToken ${apiToken}`
    };
    this.address = address;

  }


  request( { method = 'GET', endpoint, body, params, headers, async = false } ) {

    const url = `${ BASE_URL }/${ endpoint }${ params ? `?${ qs.stringify( params ) }` : ''}`;

    const req = {
      method,
      url,
      headers: headers ? Object.assign( headers, this.authHeader ) : this.authHeader,
    };

    if( body ) {
      req.data = body;

      if( typeof async === 'boolean' ) {
        req.data.async = async;
      }

    }

    return axios( req ).then( resp => resp.data );

  }

  getShipment( shipmentId ) {

    const req = {
      method: 'GET',
      endpoint: `shipments/${ shipmentId }`,
    };

    return this.request( req );

  }

  createShipment( items, destAddress, srcAddress ) {

    if( !srcAddress ) {
      srcAddress = this.address;
    }

    const parcels = items.map( dimensionalItem2Parcel );
console.log( 'parcels', parcels );

console.log( 'srcAddress', srcAddress );
    // const req = {
    //   method: 'POST',
    //   endpoint: 'shipments',
    //   body: {
    //     address_from: srcAddress,
    //     address_to: destAddress,
    //     parcels
    //   }
    // };

    // return this.request( req );

  }

  createTransaction( rateId ) {

      const req = {
        method: 'POST',
        endpoint: 'transactions',
        body: {
          rate: rateId,
          label_file_type: 'PDF_4x6'
        }
      };

      return this.request( req );
  }

}

module.exports = Client;


