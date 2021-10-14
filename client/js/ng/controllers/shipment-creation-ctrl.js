import angular from 'angular';


class ShipmentValidator {
  constructor( inputs ) {
    if( inputs ) {
      this.invalidHandle = !inputs.handle;
      this.pallets = inputs.pallets.map( p => ({ invalidHandle: !p.handle }) );
    }
    else {
      this.clean = true;
    }
  }

  arePalletsValid() {
    const isPalletValid = p => !p.invalidHandle;

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || ( !this.invalidHandle && this.arePalletsValid() );
  }
}

/******************* Shipment Creation Page Controller *************************/
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'FileModelSvc', 'ManifestFileHandlerSvc', 'messageModal', 'navigate', 'palletCategories', 'PalletsFromManifestModalSvc', 'sessionTimeout', 'ShipmentManagerSvc', 'UtilitiesSvc',
  function( FileModelSvc, ManifestFileHandlerSvc, messageModal, navigate, palletCategories, PalletsFromManifestModalSvc, sessionTimeout, ShipmentManagerSvc, UtilitiesSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [ "" ].concat( palletCategories ),
      documentToAdd: initDocumentToAdd(),
      documents: [],
      pallets: [],
      numAnonymousPallet: ''
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.addDocument = addDocument;
    vm.removeDocument = removeDocument;
    vm.hasManifest = hasManifest;
    vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
    vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
    vm.addPallet = () => addPallet({ category: vm.inputs.category });
    vm.removePallet = removePallet;
    vm.addAnonymousPallets = addAnonymousPallets;
    vm.importPalletsFromManifest = importPalletsFromManifest;
    vm.createShipment = createShipment;

    function initDocumentToAdd() {
      return {
        file: null,
        isRestricted: false
      };
    }

    function addDocument() {

      if( !vm.inputs.documentToAdd.file ) {
        return;
      }

      const documentToAdd = {
        file: vm.inputs.documentToAdd.file,
        name: vm.inputs.documentToAdd.file.name,
        size: UtilitiesSvc.humanReadableFileSize( vm.inputs.documentToAdd.file.size ),
        isRestricted: vm.inputs.documentToAdd.isRestricted,
      };
      delete vm.inputs.documentToAdd;

      vm.inputs.documents.push( documentToAdd );
      vm.inputs.documentToAdd = initDocumentToAdd();
      FileModelSvc.startReset();
    }

    function removeDocument( documentName ) {

      const foundIdx = vm.inputs.documents.findIndex( d => d.name === documentName );

      if( foundIdx >= 0 ) {
        vm.inputs.documents.splice( foundIdx, 1 );
      }

    }

    function hasManifest() {
      return vm.inputs.documents.some( d => ManifestFileHandlerSvc.isManifestFile( d.name ) );
    }

    function removePallet( idx ) {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
    }

    function refreshValidator() {
      vm.validator = new ShipmentValidator( vm.inputs );
    }

    function createShipment() {

      refreshValidator();

      if( vm.validator.isValid() ) {
        ShipmentManagerSvc.createShipment( shipmentRequest() ).then( result => {

          if( result && result.shipment ) {
            return result.shipment;
          }
          else {
            throw new Error('Server error.');
          }
        })
          .then( async (shipment) => {

            for( let _document of vm.inputs.documents ) {

              await ShipmentManagerSvc.uploadShipmentDocument( {
                shipmentId: shipment._id,
                file: _document.file,
                isRestricted: _document.isRestricted || false
              } );

            }

            return shipment;
          })
          .then( shipment => navigate.shipmentDetails( shipment._id ) )
          .catch( e => {
            messageModal.launch({header: 'Error', body: e.message, type: 'error'});
          });

      }

    }

    function addPallet( data ) {
      vm.inputs.pallets.push( data );
    }

    function addAnonymousPallets() {

      const numAnonPalletsToAdd = parseInt( vm.inputs.numAnonymousPallet );

      if( !numAnonPalletsToAdd ) {
        // TODO: warn that num anon pallets not set
        return;
      }

      if( !vm.inputs.handle ) {
        vm.validator.invalidHandle = true;
        return;
      }
      else {
        refreshValidator();
      }

      const currentNumAnonPallet = vm.inputs.pallets.reduce( (num, p) => num + ( p.isAnonymous ? 1 : 0 ) , 0 );

      const handleFn = ( idx ) => ShipmentManagerSvc.buildAnonymousPalletHandle( vm.inputs.handle, currentNumAnonPallet + 1 + idx );

      const anonPallets = [];
      for( let idx=0; idx<numAnonPalletsToAdd; idx++) {
        addPallet( { handle: handleFn( idx ), category: vm.inputs.category, isAnonymous: true } );
      }

      vm.inputs.pallets = vm.inputs.pallets.concat(anonPallets);

    }


    function shipmentRequest() {

      if( vm.inputs.totalUnits ) {
        vm.clearPalletUnits();
      }

      const shipment = Object.assign( {}, vm.inputs );
      
      // TODO: date transformations? timezone stuff?

      delete shipment.categoryOptions;

      return shipment;
    }

    function importPalletsFromManifest() {

      const manifestDocument = vm.inputs.documents.find( d => ManifestFileHandlerSvc.isManifestFile( d.name ) );

      if( manifestDocument ) {

        PalletsFromManifestModalSvc.launch( manifestDocument.file, palletNames => palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category } ) ));

      }

    }

  }

]);