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
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'FileModelSvc', 'ManifestFileHandlerSvc', 'messageModal', 'navigate', 'palletProperties', 'PalletsFromManifestModalSvc', 'sessionTimeout', 'ShipmentManagerSvc', 'UtilitiesSvc',
  function( FileModelSvc, ManifestFileHandlerSvc, messageModal, navigate, palletProperties, PalletsFromManifestModalSvc, sessionTimeout, ShipmentManagerSvc, UtilitiesSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.inputs = {
      categoryOptions: [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) ),
      conditionOptions: [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) ),
      category: null,
      condition: 'shelf-pull',
      documentToAdd: initDocumentToAdd(),
      documents: [],
      pallets: [],
      numAnonymousPallet: ''
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.addDocument = addDocument;
    vm.removeDocument = removeDocument;
    vm.hasUnimportedManifest = hasUnimportedManifest;
    vm.setPalletCosts = setPalletCosts;
    vm.setShipmentCost = setShipmentCost;
    vm.clearShipmentCategory = ( ) => vm.inputs.category = null;
    vm.setPalletCategories = ( ) => {
      if( vm.inputs.category ) {
        vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
      }
    };
    vm.clearShipmentCondition = ( ) => vm.inputs.condition = null;
    vm.setPalletConditions = ( ) => {
      if( vm.inputs.condition ) {
        vm.inputs.pallets.forEach( p => p.condition = vm.inputs.condition );
      }
    };
    vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
    vm.addPallet = () => addPallet({ category: vm.inputs.category, condition: vm.inputs.condition });
    vm.removePallet = removePallet;
    vm.addAnonymousPallets = addAnonymousPallets;
    vm.importPalletsFromManifest = importPalletsFromManifest;
    vm.createShipment = createShipment;

    function setPalletCosts() {

      if( vm.inputs.cost && vm.inputs.pallets.length ) {

        const perPalletCost = vm.inputs.cost / vm.inputs.pallets.length;

        vm.inputs.pallets.forEach( p => p.cost = perPalletCost );

      }

    }

    function setShipmentCost() {

      vm.inputs.cost = vm.inputs.pallets.reduce( ( sum, p ) => {

        if( p.cost ) {
          sum += p.cost;
        }

        return sum;
      } , 0 );

    }

    function initDocumentToAdd() {
      return {
        file: null,
        isRestricted: true
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

    function hasUnimportedManifest() {
      return vm.inputs.documents.some( d => ManifestFileHandlerSvc.isManifestFile( d.name ) && !d.isImported );
    }

    function removePallet( idx ) {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
      setPalletCosts();
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
          else if ( result && result.error ) {
            throw new Error(result.message);
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

      data.condition = data.condition || 'shelf-pull';

      vm.inputs.pallets.push( data );

      setPalletCosts();
      
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
        addPallet( { handle: handleFn( idx ), category: vm.inputs.category, condition: vm.inputs.condition, isAnonymous: true } );
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
      delete shipment.conditionOptions;

      return shipment;
    }

    function importPalletsFromManifest() {

      const manifestDocument = vm.inputs.documents.find( d => ManifestFileHandlerSvc.isManifestFile( d.name ) && !d.isImported );

      if( manifestDocument ) {

        ManifestFileHandlerSvc.launchFileParsingOptionsModal( manifestDocument.name, parseOptions => {

          PalletsFromManifestModalSvc.launch( manifestDocument.file, parseOptions, palletNames => {

            palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category, condition: vm.inputs.condition } ) );

            manifestDocument.isImported = true;

          });

        });

      }

    }

  }

]);