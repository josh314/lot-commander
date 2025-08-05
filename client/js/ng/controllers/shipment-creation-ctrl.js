import angular from 'angular';

import * as util from '../../utilities';
import { palletProperties } from '../../constants';

class ShipmentValidator {
  constructor( inputs ) {
    if( inputs ) {

      this.isPaidForUnset = (inputs.isPaidFor === null);

      this.checkCosts = inputs.checkCosts;

      this.invalidHandle = !inputs.handle;
      this.invalidCost = this.checkCosts && !inputs.cost;

      this.pallets = inputs.pallets.map( p => ({ invalidHandle: !p.handle }) );

      for( let i=0; i<inputs.pallets.length; i++ ) {

        for( let j=0; j<inputs.pallets.length; j++ ) {

          if( i!==j && inputs.pallets[i].handle === inputs.pallets[j].handle ) {

            this.pallets[i].invalidHandle = true;
            this.pallets[i].duplicateHandle = true;

          }

        }

        this.pallets[i].invalidCost = inputs.checkCosts ? !(inputs.pallets[i].cost > 0) : false;

      }

      this.invalidPriceValuePercentage = inputs.priceValuePercentage < 0;

    }
    else {
      this.clean = true;
      this.pallets = [];
    }
  }

  arePalletsValid() {
    const isPalletValid = p => {

      const validHandle = !( p.invalidHandle || p.duplicateHandle );

      return !p.invalidCost && validHandle;
    };

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || ( !this.isPaidForUnset && !this.invalidCost && !this.invalidHandle && this.arePalletsValid() );
  }
}

/******************* Shipment Creation Page Controller *************************/
angular.module('myApp').controller( 'ShipmentCreationCtrl', [

  'AppSettingsSvc',
  'FileModelSvc',
  'LoggedInUser',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',
  'ShipmentManagerSvc',

  function(

    AppSettingsSvc,
    FileModelSvc,
    LoggedInUser,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    sessionTimeout,
    ShipmentManagerSvc,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    init();

    function init() {

      vm.showRestrictedDocuments = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
      vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
      vm.showPricingData = LoggedInUser.hasPermission('VIEW_PRICING_DATA');
      vm.allowEditPricingData = LoggedInUser.hasPermission('EDIT_PRICING_DATA');

      vm.inputs = {
        isPaidFor: null,
        categoryOptions: [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _ === 'general merchandise' ? 'GM' : _, value: _ } ) ) ),
        conditionOptions: [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _ === 'customer returns' ? 'returns' : _, value: _ } ) ) ),
        documentTypeOptions: ShipmentManagerSvc.shipmentDocumentTypes.map( _ => _ === '' ? { displayName: 'none', value: _ } : { displayName: _, value: _ } ),
        category: null,
        condition: 'shelf-pull',
        documentToAdd: initDocumentToAdd(),
        documents: [],
        pallets: [],
        numAnonymousPallet: '',
        palletLevelCosts: false,
        checkCosts: vm.showPurchasingData
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
      vm.setAllPalletsToBeListed = _toBeListed => vm.inputs.pallets.forEach( p => p.toBeListed = _toBeListed );
      vm.setAllPalletsToBeProcessed = _toBeProcessed => vm.inputs.pallets.forEach( p => p.toBeProcessed = _toBeProcessed );
      vm.addPallet = () => addPallet({ category: vm.inputs.category, condition: vm.inputs.condition });
      vm.removePallet = removePallet;
      vm.addAnonymousPallets = addAnonymousPallets;
      vm.importPalletsFromManifest = importPalletsFromManifest;
      vm.createShipment = createShipment;

      return AppSettingsSvc.getDefaultPriceValuePercentage().then( _defaultPriceValuePercentage => vm.inputs.priceValuePercentage = _defaultPriceValuePercentage );

    }

    function setPalletCosts() {

      if( ! vm.inputs.palletLevelCosts ) {

        if( vm.inputs.cost && vm.inputs.pallets.length ) {

          const perPalletCost = vm.inputs.cost / vm.inputs.pallets.length;

          vm.inputs.pallets.forEach( p => p.cost = perPalletCost );

        }

      }

      refreshValidator( vm.inputs );

    }

    function setShipmentCost() {

      vm.inputs.cost = vm.inputs.pallets.reduce( ( sum, p ) => {

        if( p.cost ) {
          sum += p.cost;
        }

        return sum;
      } , 0 );

      refreshValidator( vm.inputs );
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
        return ModalSvc.message(
          { header: 'Error', body: 'This document has already been uploaded.', type: 'error' }
        )
          .then( _ => FileModelSvc.startReset() );
      }

      if( vm.inputs.documentToAdd.documentType === 'manifest' && !ManifestFileHandlerSvc.isManifestFile( vm.inputs.documentToAdd.file.name ) ) {
        const isConfirmed = await ModalSvc.confirm({
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
        size: util.humanReadableFileSize( vm.inputs.documentToAdd.file.size ),
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

        ModalSvc.confirm({
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

      if( vm.inputs.palletLevelCosts ) {
        setShipmentCost();
      }
      else {
        setPalletCosts();
      }

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

          const isConfirmed = await ModalSvc.confirm({
            header: 'No invoice',
            body: 'There is no invoice document for this shipment. Proceed anyway?',
          });


          if( !isConfirmed ) {
            return;
          }

        }

        // if there are unimported manifest files, ask for confirmation
        if( vm.inputs.documents.some( _document => isManifestFile( _document ) && !_document.isImported ) ) {
          const isConfirmed = await ModalSvc.confirm({
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

              await ShipmentManagerSvc.uploadShipmentDocumentWithRetry( {
                shipmentId: shipment._id,
                file: _document.file,
                documentType: _document.documentType,
                isRestricted: _document.isRestricted || false,
              } );

            }

            return shipment;
          })
          .then( shipment => {
            const manifest = vm.inputs.documents.find( _d => isManifestFile( _d ) );
            if( manifest ) {
              navigate.shipmentProcessManifest( shipment._id );
            }
            else {
              navigate.shipmentDetails( shipment._id );
            }
          })
          .catch( e => {
            ModalSvc.message( { header: 'Error', body: e.message, type: 'error' } );
          });

      }

    }

    function addPallet( data ) {

      data.condition = data.condition || 'shelf-pull';
      data.toBeListed = data.toBeListed || false;
      data.toBeProcessed = data.toBeProcessed || false;

      vm.inputs.pallets.push( data );

      if( !vm.inputs.palletLevelCosts ) {
        setPalletCosts();
      }

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

        const defaultParseOptions = {
          noHeaderRow: false,
          skipFirstRows: 0,
          skipLastRows: 0,
        };

        // try to parse and get columns with some default settings
        ManifestFileHandlerSvc.parseFile( manifestDocument.file, defaultParseOptions ).then( manifest => {

          let palletNames = manifest.getUniqueValuesInColumnAllSheets( 'Container' );

          if( palletNames.length ) { // test if we got any pallet names using the default parse settings

            palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category, condition: vm.inputs.condition } ) );

            manifestDocument.isImported = true;

          }
          else{ // if no pallet names could be obtained automatically, launch the modal interface

            ManifestFileHandlerSvc.launchFileParsingOptionsModal( manifestDocument.name, parseOptions => {

              ModalSvc.palletsFromManifest( manifestDocument.file, parseOptions, palletNames => {

                palletNames.forEach( p => addPallet( { handle: p, category: vm.inputs.category, condition: vm.inputs.condition } ) );

                manifestDocument.isImported = true;

              });

            });

          }

        });

      }

    }

  }

]);