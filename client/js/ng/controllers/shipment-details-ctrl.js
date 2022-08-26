import angular from 'angular';

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller( 'ShipmentDetailsCtrl', [

  'AudioAlertSvc',
  'DisplayPalletFactory',
  'FileModelSvc',
  'focus',
  'LoggedInUser',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletLotSvc',
  'PalletManifestSvc',
  'palletProperties',
  'PrintSvc',
  'sessionTimeout',
  'ShipmentManagerSvc',
  'UtilitiesSvc',

  function (

    AudioAlertSvc,
    DisplayPalletFactory,
    FileModelSvc,
    focus,
    LoggedInUser,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletLotSvc,
    PalletManifestSvc,
    palletProperties,
    PrintSvc,
    sessionTimeout,
    ShipmentManagerSvc,
    UtilitiesSvc,

  ) {

    /****************************************************
     * View variables
     * ==============
     *
     ****/

    const vm = this;
    vm.shipment = {};
    vm.waiting = {};

    vm.showEditControls = LoggedInUser.hasPermission('EDIT_INCOMING_SHIPMENT');
    vm.showReceiveControls = LoggedInUser.hasPermission('RECEIVE_INCOMING_SHIPMENT');
    vm.showHistoryControls = LoggedInUser.hasPermission('VIEW_EVENTS');
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
    vm.showTransportationCost = LoggedInUser.hasPermission('VIEW_TRANSPORTATION_COST');
    vm.showRestrictedDocuments = vm.showPurchasingData;


    vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) );
    vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) );
    vm.documentTypeOptions = ShipmentManagerSvc.shipmentDocumentTypes.map( _ => _ === '' ? { displayName: 'none', value: _ } : { displayName: _, value: _ } );

    vm.removeShipment = removeShipment;

    vm.arePalletCostsAveraged = arePalletCostsAveraged;

    vm.editValue = {};
    vm.isEditing = {};
    vm.openEdit = openShipmentEdit;
    vm.closeEdit = closeShipmentEdit;
    vm.saveEdit = saveShipmentEdit;
    vm.savePalletEdit = savePalletEdit;

    vm.preloadDocument = preloadDocument;
    vm.documentToAdd = initDocumentToAdd();
    vm.removeDocument = removeDocument;
    vm.uploadDocument = uploadDocument;
    vm.isManifestFile = isManifestFile;
    vm.cleanManifest = cleanManifest;

    vm.removeExpectedPallet = removeExpectedPallet;
    vm.addExpectedPallet = {
      isStarted: false,
      emptyHandle: false,
      duplicateHandle: false,
      invalidCost: false,
      validate: validExpectedPallet,
      start: startExpectedPallet,
      close: closeExpectedPallet,
      save: saveExpectedPallet,
    };
    vm.somePalletsEditing = ( pallets ) => pallets ? pallets.some( p => p.isEditing ) : false;

    vm.printShipmentLabels = printShipmentLabels;

    vm.receiveShipment = receiveShipment;
    vm.unreceiveShipment = unreceiveShipment;
    vm.receivePallet = receivePallet;
    vm.unreceivePallet = unreceivePallet;
    vm.receiveAnonymousPallet = receiveAnonymousPallet;

    vm.newConsolidatedPallet = newConsolidatedPallet;
    vm.removeConsolidatedPallet = removeConsolidatedPallet;

    vm.closeShipment = closeShipment;
    vm.reopenShipment = reopenShipment;

    vm.viewHistory = viewHistory;

    vm.htmlifyText = UtilitiesSvc.htmlifyText;
    vm.displayAsMoney = UtilitiesSvc.displayAsMoney;

    vm.expectedPalletsSectionTitle = () => `Expected Pallets${vm.shipment &&vm.shipment.palletsExpected && vm.shipment.palletsExpected.length ? ` (${vm.shipment.palletsExpected.length})`: ''}`;
    vm.receivedPalletsSectionTitle = () => `Received Pallets${vm.shipment &&vm.shipment.palletsReceived && vm.shipment.palletsReceived.length ? ` (${vm.shipment.palletsReceived.length})`: ''}`;
    vm.consolidatedPalletsSectionTitle = () => `Consolidated Pallets${vm.shipment &&vm.shipment.palletsConsolidated && vm.shipment.palletsConsolidated.length ? ` (${vm.shipment.palletsConsolidated.length})`: ''}`;

    vm.createPalletManifests = _document => ModalSvc.wait( { waitFor: createPalletManifestsFromShipmentStandardManifest( _document ) }).then( _ => navigate.reload ());
    vm.createPalletLot = createPalletLot;
    vm.repackPallet = repackPallet;
    vm.setAllPalletsToBeListed = setAllPalletsToBeListed;

    /****************************************************
     * Functions
     * =========
     *
     ****/

    function arePalletCostsAveraged() {
      if( !vm.shipment.palletsExpected || !vm.shipment.palletsExpected.length ) {
        return true;
      }

      let firstPalletCost = vm.shipment.palletsExpected[0].cost;
      return vm.shipment.palletsExpected.every( p => p.cost === firstPalletCost );
    }

    function openShipmentEdit( key ) {
      vm.isEditing[ key ] = true;
      vm.editValue[ key ] = vm.shipment[ key ];
    }

    function closeShipmentEdit( key ) {
      vm.isEditing[ key ] = false;
      delete vm.editValue[ key ];
    }

    function saveShipmentEdit( key ) {
      vm.isEditing[ key ] = false;
      let p; // will be set to a promise

      if( vm.editValue[ key ] !== vm.shipment[ key ] ) {

        if( key === 'cost' ) {

          if( angular.isArray(vm.shipment.palletsExpected) && arePalletCostsAveraged() ) {

            const palletCost = vm.editValue.cost / vm.shipment.palletsExpected.length;

            p = Promise.all( vm.shipment.palletsExpected.map( p => vm.shipment.editExpectedPallet( p._id, { cost: palletCost } ) ) ).then( loadShipment );

          }

        }
        else {

          p = vm.shipment.editShipment( { [ key ]: vm.editValue[ key ] } )
            .then( resp => {
              if( resp.success ) {

                if( key === 'category' && vm.editValue.category ) { /* The second condition allows blanking the shipment category without blanking the pallet categories */
                  vm.shipment.palletsExpected.forEach( p => p.category = vm.editValue.category );
                }

                if( key === 'totalUnits' ) {
                  vm.shipment.palletsExpected.forEach( p => delete p.units );
                }

                return vm.shipment[ key ] = vm.editValue[ key ];
              }
              else {
                throw new Error(resp.error);
              }
            })
            .catch( _e => {
              return ModalSvc.message( { header: 'Failure', body: 'Server Error', type: 'error' } );
            });

        }
      }

      p = p || Promise.resolve( true ); // default placeholder promise if p is not defined above
      p.then( _ => vm.closeEdit( key ) ); // close edit when done
    }

    function removeShipment() {

      ModalSvc.confirm( { header: "Delete Shipment", body: "Really delete this shipment?" } ).then( result => {
        if( result ) {
          return vm.shipment.removeShipment().then( _ => {
            navigate.shipmentList();
          });
        }
      } );
    }

    function removeExpectedPallet( idx ) {

      const pallet = vm.shipment.palletsExpected[ idx ];

      vm.shipment.removeExpectedPallet( pallet._id )
        .then( resp => {

          if( resp.success ) {
            vm.shipment.palletsExpected.splice( idx, 1 );
          }
          else {
            throw new Error(resp.error);
          }

        })
        .catch( _e => {
          return ModalSvc.message( { header: 'Failure', body: 'Server Error', type: 'error' } );
        });
    }


    // These functions are methods of the `vm.addExpectedPallet` object defined above. `this` refers to `vm.addExpectedPallet`
    /* eslint-disable angular/controller-as-vm */
    function startExpectedPallet() {
      this.isStarted = true;
      this.errors = {};
      this.data = {
        category: vm.shipment.category || null,
        condition: vm.shipment.condition || 'shelf-pull'
      };
      focus('add-expected-pallet-input');
    }

    function closeExpectedPallet() {
      this.isStarted = false;
      this.errors = {};
      this.data = {};
    }

    function validExpectedPallet() {

      if( !vm.shipment.validatePalletHandle( 'expected' )( this.data.handle ) ) {

        if( this.data.handle ) {
          this.errors.emptyHandle = false;
          this.errors.duplicateHandle = true;
        }
        else {
          this.errors.emptyHandle = true;
          this.errors.duplicateHandle = false;
        }

      }
      else {
        this.errors.duplicateHandle = this.errors.emptyHandle = false;
      }

      this.errors.invalidCost = vm.showPurchasingData ? !( this.data.cost > 0 ) : false;

      return Object.values( this.errors ).some( _ => _ ) ? false : true;

    }

    function saveExpectedPallet() {

      if( this.data.isAnonymous && !this.data.handle ) {

        const currentNumAnonPallet = vm.shipment.getNumAnonyomusPalletExpected();

        this.data.handle = vm.shipment.buildAnonymousPalletHandle( currentNumAnonPallet + 1 );

      }

      if( !this.validate() ) {
        return;
      }

      return vm.shipment.addExpectedPallet( this.data )
        .then( resp => {

          if( resp.success ) {

            return loadShipment().then( _ => this.close() );

          }
          else {
            throw new Error(resp.error);
          }

        })
        .catch( _e => {
          return ModalSvc.message( { header: 'Failure', body: 'Server Error', type: 'error' } );
        });

    }
    /* eslint-enable */

    function savePalletEdit( pallet ) {

      pallet.saveEdit( false ).then( result => {
        if( result ) {
          loadShipment();
        }
      });

    }

    async function setAllPalletsToBeListed( type, toBeListed ) {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Edit pallets to be listed?',
        html: `<p>This will set all pallets to ${toBeListed ? '' : '<strong>not</strong> ' }be listed. Continue?</p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      vm.waiting.palletsExpected = true;

      const editRequests = [];

      if( type === 'expected' ) {

        for( let pallet of vm.shipment.palletsExpected ) {

          pallet.openEdit();
          pallet.editValues.toBeListed = toBeListed;
          editRequests.push( pallet.saveEdit() );

        }

      }

      Promise.all( editRequests ).then( _ => {
        vm.waiting.palletsExpected = false;
        loadShipment();
      });
    }

    /*******************************************************
     * Documents
     * =========
     *
     *******/

    function updateDocumentList() {

      vm.waiting.documents = true;

      vm.shipment.listShipmentDocuments().then( resp => {

        if( resp.error ) {
          vm.waiting.documents = false;
          return ModalSvc.message( { header: 'Failure', body: 'Server Error: documents unavailable', type: 'error' } );
        }

        const documents = resp.documents;
        if( documents ) {

          documents.forEach( doc => {

            doc.isRestricted = doc.permission === 'VIEW_PURCHASING_DATA';

            doc.updateRestrictionStatus = () => vm.shipment.updateShipmentDocumentProperties( doc.name, { isRestricted: doc.isRestricted } ).then( updateDocumentList );

            doc.updateDocumentType = oldDocumentType => {

              if( doc.documentType !== 'manifest' ) {
                return vm.shipment.updateShipmentDocumentProperties( doc.name, { documentType: doc.documentType } ).then( updateDocumentList );
              }
              else if( !ManifestFileHandlerSvc.isManifestFile( doc.name ) ) {

                ModalSvc.confirm({
                  header: 'Filetype mismatch',
                  body: 'File extension is unexpected for a manifest. Proceed anyway?',
                }).then( isConfirmed => {

                  if( isConfirmed ) {
                    return vm.shipment.updateShipmentDocumentProperties( doc.name, { documentType: doc.documentType } ).then( updateDocumentList );
                  }
                  else {
                    doc.documentType = oldDocumentType;
                  }

                });

              }

            };

          });

          Object.assign( vm, { documents } );
        }

        vm.waiting.documents = false;

      });

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
          vm.documentToAdd.documentType = 'manifest';
        }
        else if ( vm.documentToAdd.documentType === 'manifest' ) {
          vm.documentToAdd.documentType = null;
        }

      }

    }

    async function uploadDocument() {
      if(!vm.documentToAdd.file) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      const duplicateDocument = vm.documents.find( _d => _d.name === vm.documentToAdd.file.name );

      if( duplicateDocument ) {
        ModalSvc.message(
          { header: 'Error', body: 'This document has already been uploaded.', type: 'error' },
          null,
          () => {
            vm.documentToAdd = initDocumentToAdd();
            FileModelSvc.startReset();
          }
        );
        return;
      }

      if( vm.documentToAdd.documentType === 'manifest' && !ManifestFileHandlerSvc.isManifestFile( vm.documentToAdd.file.name ) ) {
        const isConfirmed = await ModalSvc.confirm({
          header: 'Filetype mismatch',
          body: 'File extension is unexpected for a manifest. Proceed anyway?',
        });

        if( !isConfirmed ) {
          return;
        }

      }

      vm.waiting.documents = true;
      vm.shipment.uploadShipmentDocument(
        vm.documentToAdd.file,
        {
          isRestricted: vm.documentToAdd.isRestricted,
          documentType: vm.documentToAdd.documentType
        }
      ).then( _ => {
        updateDocumentList();
        vm.waiting.documents = false;
        vm.documentToAdd = initDocumentToAdd();
        FileModelSvc.startReset();
      });

    }

    function removeDocument( documentName ) {

      vm.waiting.documents = true;

      vm.shipment.removeShipmentDocument( documentName ).then( _ => {
        updateDocumentList();
        vm.waiting.documents = false;
      });
    }

    function cleanManifest( _document ) {

      ManifestFileHandlerSvc.launchFileParsingOptionsModal( _document.name, options => {

        options.renameStandardColumns = true;

        vm.shipment.getShipmentDocument( _document.name ).then( data => {

          ManifestFileHandlerSvc.parse( data, _document.name, options );

          navigate.shipmentCleanManifest( vm.shipment._id );

        });

      });

    }


    async function createPalletManifestsFromShipmentStandardManifest( _document ) {

      const data = await vm.shipment.getShipmentDocument( _document.name );

      const manifests = await ManifestFileHandlerSvc.splitStandardManifestByPallet( data );

      const uploads = [];
      for ( let m of manifests ) {

        const file = m.file;
        const summary = m.summary;

        const match = file.name.match( /(.*)\.xlsx/ );

        let expectedPallet;
        let receivedPallet;

        if( match ) {

          const palletHandle = match[1];

          expectedPallet = vm.shipment.palletsExpected.find( _p => _p.handle === palletHandle );
          receivedPallet = vm.shipment.palletsReceived.find( _p => _p.handle === palletHandle );

        }

        const options = {
          removedItems: [],
        };
        if( summary ) {
          Object.assign( options, summary, { units: summary.quantity } );
        }

        if( receivedPallet ) {
          uploads.push( PalletManifestSvc.uploadReceivedPalletManifest( receivedPallet, file, options ) );
        }

        if ( expectedPallet ) {
          uploads.push( PalletManifestSvc.uploadExpectedPalletManifest( vm.shipment, expectedPallet._id, file, options ) );
        }

      }

      return Promise.all( uploads );

    }

    function createPalletLot( pallet ) {

      PalletLotSvc.createLotWithUi( pallet )
        .then( lot => navigate.viewLot( lot._id ), console.log('dismissed') );
      // TODO: handle error if lot not created. Particular issue is if the auto-generated handle is a dupe

    }

    function repackPallet( pallet ) {
      navigate.repackPallet( pallet._id );
    }

    /*******************************************************
     * Receiving
     * =========
     *
     *******/

    function receiveShipment() {

      return vm.shipment.receiveShipment().then( _response => {

        return loadShipment().then( _response => {

          focus('receivedPalletIdInput');

        });

      });

    }

    function unreceiveShipment() {

      return vm.shipment.unreceiveShipment().then( _response => {

        return loadShipment();

      });

    }

    function receivePallet() {

      const duplicatePalletMessageObj = { header: 'Error', html: `<p>Duplicate pallet handle: <strong class="h4 text-danger">${vm.receivedPalletId}</strong></p>`, type: 'error' };

      if( vm.receivedPalletId ) {

        const found = vm.shipment.palletsReceived.find( p => p.handle === vm.receivedPalletId );

        if( found ) {
          AudioAlertSvc.warning();
          ModalSvc.message(
            duplicatePalletMessageObj,
            null,
            _ => vm.receivedPalletId = ''
          );
          return;
        }

        const expected = vm.shipment.palletsExpected.find( p => p.handle === vm.receivedPalletId );
        if( expected ) {
          AudioAlertSvc.success();
        }
        else {
          AudioAlertSvc.fail();
        }

        return vm.shipment.receivePallet( { handle: vm.receivedPalletId } ).then( _response => {

          if( _response.error ) {

            AudioAlertSvc.warning();

            let messageObj = _response.code === 'DUPLICATE_PALLET_HANDLE' ? duplicatePalletMessageObj : { header: 'Error', body: `Server error.`, type: 'error' };

            ModalSvc.message(
              messageObj,
              null,
              _ => vm.receivedPalletId = ''
            );

          }

          vm.receivedPalletId = '';

          return loadShipment().then( _ => focus( 'receivedPalletIdInput' ) );

        });

      }
    }

    function unreceivePallet( pallet ) {

      return vm.shipment.unreceivePallet( pallet._id ).then( _response => {
        return loadShipment();
      });

    }

    function receiveAnonymousPallet() {

      const nextAnonPalletExpected = vm.shipment.getNextAnonymousPalletExpected();

      let handle;
      if( nextAnonPalletExpected ) {

        handle = nextAnonPalletExpected.handle;

      }
      else {

        const currentNumAnonPalletReceived = vm.shipment.getNumAnonyomusPalletReceived();
        handle = vm.shipment.buildAnonymousPalletHandle( currentNumAnonPalletReceived + 1 );

      }

      return vm.shipment.receivePallet( { handle: handle, isAnonymous: true } ).then( _response => {

        vm.receivedPalletId = '';

        return loadShipment().then( _ => focus( 'receivedPalletIdInput' ) );

      });

    }


    /*******************************************************
     * Consolidation
     * =============
     *
     *******/

    function newConsolidatedPallet() {

      const palletNumber = vm.shipment.palletsConsolidated.length + 1;

      const _data = {
        handle: `${ vm.shipment.handle }__con${ palletNumber }`,
        isAnonymous: false,
        category: vm.shipment.category,
        shipment: vm.shipment,
      };

      if( vm.shipment.cost && vm.shipment.palletsExpected.length ) {

        const costPerPallet = vm.shipment.cost / vm.shipment.palletsExpected.length;

        _data.cost = costPerPallet;

      }

      ModalSvc.inventoryPalletDetails( _data ).then(result => {

        const pallet = Object.assign( {}, result );
        delete pallet.shipment;

        if( pallet.isBrokendown ) {
          pallet.brokendownDate = new Date();
        }

        return vm.shipment.addConsolidatedPallet( pallet ).then( _response => {

          const duplicatePalletMessageObj = { header: 'Error', html: `<p>Duplicate pallet handle: <strong class="h4 text-danger">${pallet.handle}</strong></p>`, type: 'error' };

          if( _response.error ) {

            AudioAlertSvc.warning();

            let messageObj = _response.code === 'DUPLICATE_PALLET_HANDLE' ? duplicatePalletMessageObj : { header: 'Error', body: `Server error.`, type: 'error' };

            ModalSvc.message(
              messageObj,
              null,
              _ => vm.receivedPalletId = ''
            );

          }

          return loadShipment();
        } );
      });


    }

    function removeConsolidatedPallet( pallet ) {

      return vm.shipment.removeConsolidatedPallet( pallet._id ).then( _response => {
        return loadShipment();
      });

    }


    /*******************************************************
     * Labels
     * ======
     *
     *******/

    function printShipmentLabels( palletList ) {
      PrintSvc.printIncomingShipmentLabels( vm.shipment._id, palletList );
    }


    /*******************************************************
     * Close/Reopen
     * ======
     *
     *******/

    function closeShipment() {
      vm.shipment.isClosed = true;
      return vm.shipment.close();
    }

    function reopenShipment() {
      vm.shipment.isClosed = false;
      return vm.shipment.reopen();
    }


    /*******************************************************
     * View Events
     * ======
     *
     *******/

    function viewHistory() {
      // EventsSvc.getShipmentEvents( vm.shipment._id ).then( _ => navigate.history() );
      navigate.history( 'shipments', vm.shipment._id );
    }

    /*******************************************************
     * Initialization
     * ==============
     *
     *******/

    function loadShipment() {
      return ShipmentManagerSvc.loadShipment( { populate: [ 'pallets_received', 'pallets_consolidated' ], hydratePalletObjects: true } ).then( shipment => {

        Object.assign(vm.shipment, shipment);

        vm.shipment.palletsReceived = shipment.palletsReceived.map( p => DisplayPalletFactory( p, { shipment, type: 'received', checkCost: vm.showPurchasingData } ) );
        vm.shipment.palletsExpected = shipment.palletsExpected.map( p => DisplayPalletFactory( p, { shipment, type: 'expected', checkCost: vm.showPurchasingData } ) );
        vm.shipment.palletsConsolidated = shipment.palletsConsolidated.map( p => DisplayPalletFactory( p, { shipment, type: 'consolidated', checkCost: vm.showPurchasingData } ) );

      });
    }

    const init = () => {

      sessionTimeout.timeoutExpired();

      loadShipment().then( updateDocumentList );

    };

    // init the page
    init();
  }]);

/******************* Constructor for Pallet Objects *************************/
angular.module('myApp').factory( 'DisplayPalletFactory', [ 'ModalSvc',
  function( ModalSvc ) {

    const saveFn = {
      expected: _shipment => _shipment.editExpectedPallet.bind( _shipment ),
      received: _shipment => _shipment.editReceivedPallet.bind( _shipment ),
      consolidated: _shipment => _shipment.editConsolidatedPallet.bind( _shipment ),
    };

    const editFields = {
      expected: [
        'handle',
        'units',
        'category',
        'condition',
        'cost',
        'toBeListed',
      ],
      received: [
        'handle',
        'hasProblem',
        'note'
      ],
      consolidated: [
        'handle',
        'units',
        'hasProblem',
        'note'
      ]
    };

    function DisplayPallet( _data, { shipment, type, checkCost } ) {

      const savePallet = saveFn[ type ]( shipment );

      const pallet = Object.assign( _data, { shipment } );

      if( type === 'received' || type === 'consolidated' ) {
        pallet.showNote = false;
        pallet.toggleShowNote = function() { this.showNote = !this.showNote; };
      }

      if( type === 'expected' ) {
        shipment.listExpectedPalletDocuments( pallet._id ).then( resp => {
          pallet.documents = resp && resp.documents ? resp.documents : [];
        });
      }

      pallet.validate = function( ) {

        this.errors.emptyHandle = !this.editValues.handle;

        this.errors.invalidCost = checkCost ? ! ( this.editValues.cost > 0 ) : false;

        if( type === 'expected' ) {

          if( shipment && shipment.palletsExpected ) {

            this.errors.duplicateHandle = !! shipment.palletsExpected.find( _ => (_.handle === this.editValues.handle) && ( _._id !== this._id ) );

          }

        }

        return Object.values( this.errors ).some( _ => _ ) ? false : true;
      };

      pallet.isEdited = function( ) {

        for( let field of editFields[ type ] ) {
          if( this.editValues[ field ] !== this[ field ] ) {
            return true;
          }
        }

        return false;
      };

      pallet.cloneEditFields = function() {
        const res = {};
        for( let field of editFields[ type ] ) {
          res[ field ] = this[ field ];
        }
        if( !res.condition ) {
          res.condition = null;
        }
        if( !res.category ) {
          res.category = null;
        }
        return res;
      };

      pallet.openEdit = function( ) {
        this.editValues = this.cloneEditFields();
        this.errors = {};
        this.isEditing = true;
      };

      pallet.closeEdit = function( ) {
        this.isEditing = false;
        this.errors = {};
        delete this.editValues;
      };

      pallet.saveEdit = function( ) {

        if( !this.validate() ) {
          return Promise.resolve( false );
        }

        this.isEditing = false;
        let p;

        if( pallet.isEdited() ) {

          /* eslint-disable indent */
          const shipmentEditCategoryPromise = shipment.category && this.editValues.category !== shipment.category ?
                                                shipment.editShipment( { category: '' } ) :
                                                Promise.resolve( true );
          /* eslint-enable indent */

          p = shipmentEditCategoryPromise.then( _ => savePallet( this._id, this.editValues ) )
            .then( resp => {
              if( resp.success ) {
                Object.assign( this, this.editValues );
                return true;
              }
              else {
                throw new Error(resp.error);
              }
            })
            .catch( _e => {
              ModalSvc.message( { header: 'Failure', body: 'Server Error', type: 'error' } );
              return false;
            });

        }
        else {

          p = Promise.resolve( true );

        }

        return p.then( result => {
          this.closeEdit();
          return result;
        });
      };

      pallet.getManifestMetadata = () => {
        if( pallet.documents ) {
          const manifest = pallet.documents.find( _d => _d.documentType === 'manifest' );
          return manifest;
        }
      };

      pallet.hasManifest = () => {
        return !!pallet.getManifestMetadata();
      };

      return pallet;
    }

    return DisplayPallet;
  }]);

