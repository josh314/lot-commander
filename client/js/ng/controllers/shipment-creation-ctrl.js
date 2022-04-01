import angular from 'angular';


class ShipmentValidator {
  constructor( inputs ) {
    if( inputs ) {
      this.invalidHandle = !inputs.handle;
      this.pallets = inputs.pallets.map( p => ({ invalidHandle: !p.handle }) );

      for( let i=0; i<inputs.pallets.length; i++ ) {

        for( let j=0; j<inputs.pallets.length; j++ ) {

          if( i!==j && inputs.pallets[i].handle === inputs.pallets[j].handle ) {

            this.pallets[i].invalidHandle = true;
            this.pallets[i].duplicateHandle = true;

          }

        }

      }

    }
    else {
      this.clean = true;
      this.pallets = [];
    }
  }

  arePalletsValid() {
    const isPalletValid = p => !( p.invalidHandle || p.duplicateHandle );

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || ( !this.invalidHandle && this.arePalletsValid() );
  }
}

/******************* Shipment Creation Page Controller *************************/
angular.module('myApp').controller('ShipmentCreationCtrl', [ 'ConfirmationModal', 'FileModelSvc', 'LoggedInUser', 'ManifestFileHandlerSvc', 'messageModal', 'navigate', 'palletProperties', 'PalletsFromManifestModalSvc', 'sessionTimeout', 'ShipmentManagerSvc', 'UtilitiesSvc',
  function( ConfirmationModal, FileModelSvc, LoggedInUser, ManifestFileHandlerSvc, messageModal, navigate, palletProperties, PalletsFromManifestModalSvc, sessionTimeout, ShipmentManagerSvc, UtilitiesSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showRestrictedDocuments = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

    vm.inputs = {
      categoryOptions: [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) ),
      conditionOptions: [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) ),
      documentTypeOptions: ShipmentManagerSvc.shipmentDocumentTypes.map( _ => _ === '' ? { displayName: 'none', value: _ } : { displayName: _, value: _ } ),
      category: null,
      condition: 'shelf-pull',
      documentToAdd: initDocumentToAdd(),
      documents: [],
      pallets: [],
      numAnonymousPallet: '',
      palletLevelCosts: false
    };
    vm.validator = new ShipmentValidator();

    vm.refreshValidator = refreshValidator;
    vm.checkShipmentHandle = checkShipmentHandle;
    vm.isManifestFile = isManifestFile;
    vm.preloadDocument = preloadDocument;
    vm.addDocument = addDocument;
    vm.validateDocumentType = validateDocumentType;
    vm.removeDocument = removeDocument;
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

      if( ! vm.inputs.palletLevelCosts ) {

        if( vm.inputs.cost && vm.inputs.pallets.length ) {

          const perPalletCost = vm.inputs.cost / vm.inputs.pallets.length;

          vm.inputs.pallets.forEach( p => p.cost = perPalletCost );

        }

      }

    }

    function setShipmentCost() {

      vm.inputs.cost = vm.inputs.pallets.reduce( ( sum, p ) => {

        if( p.cost ) {
          sum += p.cost;
        }

        return sum;
      } , 0 );

      vm.inputs.palletLevelCosts = true;

    }

    function initDocumentToAdd() {
      return {
        file: null,
        isRestricted: vm.showRestrictedDocuments,
        documentType: ''
      };
    }

    function isManifestFile( _document ) {
      return _document.documentType === 'manifest' && ManifestFileHandlerSvc.isManifestFile( _document.name );
    }

    function preloadDocument( $event ) {

      const file = $event.target.files[0];

      if( file ) {

        if( ManifestFileHandlerSvc.isManifestFile( file.name ) ) {
          vm.inputs.documentToAdd.documentType = 'manifest';
        }
        else if ( vm.inputs.documentToAdd.documentType === 'manifest' ) {
          vm.inputs.documentToAdd.documentType = null;
        }

      }

    }

    async function addDocument() {

      if( !vm.inputs.documentToAdd.file ) {
        return;
      }

      const duplicateDocument = vm.inputs.documents.find( d => d.name === vm.inputs.documentToAdd.file.name );

      if( duplicateDocument ) {
        messageModal.launch(
          { header: 'Error', body: 'This document has already been uploaded.', type: 'error' },
          null,
          _ => FileModelSvc.startReset()
        );
        return;
      }

      if( vm.inputs.documentToAdd.documentType === 'manifest' && !ManifestFileHandlerSvc.isManifestFile( vm.inputs.documentToAdd.file.name ) ) {
        const isConfirmed = await ConfirmationModal.launch({
          header: 'Filetype mismatch',
          body: 'File extension is unexpected for a manifest. Proceed anyway?',
        });

        if( !isConfirmed ) {
          return;
        }

      }

      const documentToAdd = {
        file: vm.inputs.documentToAdd.file,
        name: vm.inputs.documentToAdd.file.name,
        size: UtilitiesSvc.humanReadableFileSize( vm.inputs.documentToAdd.file.size ),
        documentType: vm.inputs.documentToAdd.documentType,
        isRestricted: vm.inputs.documentToAdd.isRestricted,
      };
      delete vm.inputs.documentToAdd;

      vm.inputs.documents.push( documentToAdd );
      vm.inputs.documentToAdd = initDocumentToAdd();
      FileModelSvc.startReset();
    }

    function validateDocumentType( _document, oldDocumentType ) {

      if( _document.documentType === 'manifest' && !ManifestFileHandlerSvc.isManifestFile( _document.file.name ) ) {

        ConfirmationModal.launch({
          header: 'Filetype mismatch',
          body: 'File extension is unexpected for a manifest. Proceed anyway?',
        }).then( isConfirmed => {

          if( !isConfirmed ) {
            _document.documentType = oldDocumentType;
          }

        });

      }
    }

    function removeDocument( documentName ) {

      const foundIdx = vm.inputs.documents.findIndex( d => d.name === documentName );

      if( foundIdx >= 0 ) {
        vm.inputs.documents.splice( foundIdx, 1 );
      }

    }

    function removePallet( idx ) {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
      setPalletCosts();
    }

    function checkShipmentHandle() {

      if( vm.inputs.handle ) {
        ShipmentManagerSvc.loadShipmentByHandle( { handle: vm.inputs.handle } ).then( shipment => {

          vm.validator.duplicateHandle = !!shipment;
          vm.validator.invalidHandle = vm.validator.duplicateHandle;
          vm.validator.clean = false;

        });
      }
      else {
        vm.validator = new ShipmentValidator( vm.inputs );
      }

    }

    function refreshValidator() {
      vm.validator = new ShipmentValidator( vm.inputs );
    }

    async function createShipment() {

      refreshValidator();

      if( vm.validator.isValid() ) {

        // if there is no invoice document, ask for confirmation
        if( vm.showRestrictedDocuments && ! vm.inputs.documents.some( _document => _document.documentType === 'invoice' ) ) {
          const isConfirmed = await ConfirmationModal.launch({
            header: 'No invoice',
            body: 'There is no invoice document for this shipment. Proceed anyway?',
          });

          if( !isConfirmed ) {
            return;
          }

        }

        // if there are unimported manifest files, ask for confirmation
        if( vm.inputs.documents.some( _document => isManifestFile( _document ) && !_document.isImported ) ) {
          const isConfirmed = await ConfirmationModal.launch({
            header: 'Unimported manifest',
            body: 'There are manifest files still available for import. Proceed anyway?',
          });

          if( !isConfirmed ) {
            return;
          }

        }

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
                documentType: _document.documentType,
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

    function importPalletsFromManifest( manifestDocument ) {

      if( manifestDocument && manifestDocument.documentType === 'manifest' && !manifestDocument.isImported ) {

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