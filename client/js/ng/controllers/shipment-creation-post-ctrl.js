import angular from 'angular';

import * as util from '../../utilities';


/******************* Shipment Post Creation Page Controller *************************/
angular.module('myApp').controller( 'ShipmentCreationPostCtrl', [

  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletManifestSvc',
  'ShipmentManagerSvc',

  function(

    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletManifestSvc,
    ShipmentManagerSvc,

  ) {

    const vm = this;
    init();

    async function reject() {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Reject manifest processing?',
        html: '<p>This will reject all results from processing manifest including the creation of individual pallet manifests and computations of unit and retail value totals.</p><p>Proceed anyway?</p>',
      });

      if( isConfirmed ) {
        navigate.shipmentDetails( vm.shipment._id );
      }

    }

    async function accept() {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Accept manifest processing?',
        html: '<p>This will accept all results from processing manifest and save individual pallet manifests and computations of unit and retail value totals.</p><p>Proceed?</p>',
      });

      if( !isConfirmed ) {
        return;
      }

      const uploads = [];
      for ( let p of vm.pallets ) {

        const file = p.file;
        const summary = p.summary;

        const match = file.name.match( /(.*)\.xlsx/ );

        let expectedPallet;

        if( match ) {

          const palletHandle = match[1];

          expectedPallet = vm.shipment.palletsExpected.find( _p => _p.handle === palletHandle );

        }

        const options = {
          removedItems: [],
        };
        if( summary ) {
          Object.assign( options, { units: summary.quantity, retailValue: summary.retailValue } );
        }

        if ( expectedPallet ) {
          uploads.push( PalletManifestSvc.uploadExpectedPalletManifest( vm.shipment, expectedPallet._id, file, options ) );
        }

      }

      // TODO: any updates to shipment? units, total estimatedRetailValue?

      return Promise.all( uploads ).then( _ => navigate.shipmentDetails( vm.shipment._id ) );

    }

    async function loadShipment() {

      const shipment = await ShipmentManagerSvc.loadShipment();

      Object.assign(vm.shipment, shipment);

      return shipment;
    }

    function loadDocuments( shipment ) {

      return shipment.listShipmentDocuments().then( resp => {

        const { error, documents } = resp;

        if( error ) {
          return ModalSvc.message( { header: 'Failure', body: 'Server Error: documents unavailable', type: 'error' } );
        }

        vm.documents = documents;

        return documents;
      });

    }


    function loadManifest( ) {

      const manifestMetadata = vm.documents.find( _d => _d.documentType === 'manifest' );

      if( manifestMetadata ) {
        return vm.shipment.getShipmentDocument( manifestMetadata.name ).then( file => {

          const manifest = ManifestFileHandlerSvc.parse( file, { noHeaderRow: false, skipFirstRows: 0, skipLastRows: 0 } );
          vm.manifest = manifest;
          processManifest();
          vm.waiting = false;
        });
      }
    }

    function processManifest() {

      if( !vm.manifest ) {
        return ModalSvc.message( { header: 'Failure', body: 'Manifest could not be retrieved.', type: 'error' } );
      }

      const results = ManifestFileHandlerSvc.defaultProcessActiveManifest();

      vm.sheetProcessingResults = results;

      vm.pallets = [];
      for( let _res of results ) {

        if( !_res.success ) {
          continue;
        }

        for( let _pallet of _res.pallets ) {

          vm.pallets.push( Object.assign(
            {},
            _pallet,
            {
              isExpected: !!vm.shipment.palletsExpected.find( _p => _p.handle === _pallet.name ),
              sheet: _res.sheet,
              units: _pallet.summary && _pallet.summary.quantity,
              retailValue: _pallet.summary && _pallet.summary.retailValue,
              download: function(){

                /* eslint-disable angular/document-service */
                const tempLink = document.createElement("a");
                /* eslint-disable angular/document-service */

                tempLink.setAttribute('href', URL.createObjectURL( _pallet.file ) );
                tempLink.setAttribute('download', _pallet.file.name );
                tempLink.click();

                URL.revokeObjectURL(tempLink.href);
              },
            }
          ) );


          vm.unexpectedPallets = vm.pallets.reduce( (acc, _p) => acc || ! _p.isExpected , false );

        }

      }

      return results;
    }

    function totalComputedPalletUnits() {
      if( vm.pallets ) {
        return vm.pallets.reduce( (acc, _p) => acc + ( _p.units ? _p.units : 0 ), 0 );
      }
    }


    function totalComputedPalletRetailValue() {
      if( vm.pallets ) {
        const totalRetailValue = vm.pallets.reduce( (acc, _p) => acc + ( _p.retailValue ? _p.retailValue : 0 ), 0 );
        return util.displayAsMoney( totalRetailValue );
      }
    }

    function init() {
      vm.displayAsMoney = util.displayAsMoney;
      vm.accept = accept;
      vm.reject = reject;
      vm.totalComputedPalletUnits = totalComputedPalletUnits;
      vm.totalComputedPalletRetailValue = totalComputedPalletRetailValue;
      vm.shipment = {};

      vm.waiting = true;
      loadShipment()
        .then( loadDocuments )
        .then( loadManifest )
        .then(()=>console.log(vm));

    }

  }
] );
