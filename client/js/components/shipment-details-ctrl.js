import angular from 'angular';

function htmlifyText( txt = "" ) {
  return txt.split("\n").join('<br/>');
}

/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'AudioAlertSvc', 'ConfirmationModal', 'DisplayPalletFactory', 'EventsSvc', 'focus', 'LoggedInUser', 'messageModal', 'navigate', 'palletCategories', 'PrintSvc', 'sessionTimeout', 'ShipmentManagerSvc',
  function( AudioAlertSvc, ConfirmationModal, DisplayPalletFactory, EventsSvc, focus, LoggedInUser, messageModal, navigate, palletCategories, PrintSvc, sessionTimeout, ShipmentManagerSvc ) {

    /****************************************************
     * View variables
     * ==============
     *
     ****/

    const vm = this;
    vm.shipment = {};

    vm.showEditControls = LoggedInUser.hasPermission('EDIT_INCOMING_SHIPMENT');
    vm.showReceiveControls = LoggedInUser.hasPermission('RECEIVE_INCOMING_SHIPMENT');
    vm.showHistoryControls = LoggedInUser.hasPermission('VIEW_EVENTS');
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
    vm.showRestrictedDocuments = vm.showPurchasingData;
    vm.categoryOptions = [ "" ].concat( palletCategories );

    vm.removeShipment = removeShipment;

    vm.editValue = {};
    vm.isEditing = {};
    vm.openEdit = openShipmentEdit;
    vm.closeEdit = closeShipmentEdit;
    vm.saveEdit = saveShipmentEdit;
    vm.savePalletEdit = savePalletEdit;

    vm.removeDocument = removeDocument;
    vm.uploadDocument = uploadDocument;

    vm.removeExpectedPallet = removeExpectedPallet;
    vm.addExpectedPallet = {
      isStarted: false,
      start: startExpectedPallet,
      close: closeExpectedPallet,
      save: saveExpectedPallet,
    };

    vm.printShipmentLabels = printShipmentLabels;

    vm.receiveShipment = receiveShipment;
    vm.unreceiveShipment = unreceiveShipment;
    vm.receivePallet = receivePallet;
    vm.unreceivePallet = unreceivePallet;
    vm.receiveAnonymousPallet = receiveAnonymousPallet;

    vm.closeShipment = closeShipment;
    vm.reopenShipment = reopenShipment;

    vm.viewHistory = viewHistory;

    vm.htmlifyText = htmlifyText;

    /****************************************************
     * Functions
     * =========
     *
     ****/

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
        p = vm.shipment.editShipment( { [ key ]: vm.editValue[ key ] } )
          .then( resp => {
            if( resp.success ) {

              if( key === 'category' ) {
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
            return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
          });
      }
      else {
        p = Promise.resolve( true );
      }

      p.then( _ => vm.closeEdit( key ) ); // close edit when done
    }

    function removeShipment() {

      ConfirmationModal.launch({ header: "Delete Shipment", body: "Really delete this shipment?" }).then( result => {
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
          return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
        });
    }


    /* eslint-disable angular/controller-as-vm */
    function startExpectedPallet() {
      this.isStarted = true;
      focus('add-expected-pallet-input');
    }

    function closeExpectedPallet() {
      this.isStarted = false;
      this.data = {};
    }

    function saveExpectedPallet() {

      if( this.data.isAnonymous && !this.data.handle ) {

        const currentNumAnonPallet = vm.shipment.getNumAnonyomusPalletExpected();

        this.data.handle = vm.shipment.buildAnonymousPalletHandle( currentNumAnonPallet + 1 );

      }

      if( !vm.shipment.validatePalletHandle( 'expected' )( this.data.handle ) ) {
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
          return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
        });

    }
    /* eslint-enable */

    function savePalletEdit( pallet ) {

      pallet.saveEdit().then( _ => {
        loadShipment();
      });

    }

    /*******************************************************
     * Documents
     * =========
     * 
     *******/

    function updateDocumentList() {

      vm.waitingForResponse = true;

      vm.shipment.listShipmentDocuments().then( documents => {

        if( documents ) {

          documents.forEach( doc => {

            doc.isRestricted = doc.permission === 'VIEW_PURCHASING_DATA';

            doc.updateRestrictionStatus = () => vm.shipment.updateDocumentRestrictionStatus( doc.name, doc.isRestricted ).then( updateDocumentList );

          });

          Object.assign( vm, { documents } );
        }

        vm.waitingForResponse = false;

      });

    }

    function uploadDocument() {
      if(!vm.documentToUpload) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      const document = vm.documentToUpload;
      const isRestricted = !!vm.documentToUploadIsRestricted;

      vm.waitingForResponse = true;
      vm.shipment.uploadShipmentDocument( document, isRestricted ).then( _ => {
        updateDocumentList();
        vm.waitingForResponse = false;
      });

    }

    function removeDocument( documentName ) {

      vm.waitingForResponse = true;

      vm.shipment.removeShipmentDocument( documentName ).then( _ => {
        updateDocumentList();
        vm.waitingForResponse = false;
      });
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

      if( vm.receivedPalletId ) {

        const found = vm.shipment.palletsReceived.find( p => p.handle === vm.receivedPalletId );

        if( found ) {
          AudioAlertSvc.warning();
          vm.receivedPalletId = '';
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

          vm.receivedPalletId = '';

          return loadShipment().then( _ => focus( 'receivedPalletIdInput' ) );

        });

      }
    }

    function unreceivePallet( idx ) {

      const pallet = vm.shipment.palletsReceived[idx];

      if( !pallet ) {
        return;
      }

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
      return ShipmentManagerSvc.loadShipment( { populate: [ 'pallets_received' ] } ).then( shipment => {

        Object.assign(vm.shipment, shipment);

        vm.shipment.palletsReceived = shipment.palletsReceived.map( p => DisplayPalletFactory( shipment, 'received', p ) );
        vm.shipment.palletsExpected = shipment.palletsExpected.map( p => DisplayPalletFactory( shipment, 'expected', p ) );

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
angular.module('myApp').factory('DisplayPalletFactory', [ 'messageModal', 
  function( messageModal ) {

    const saveFn = {
      expected: _shipment => _shipment.editExpectedPallet.bind( _shipment ),
      received: _shipment => _shipment.editReceivedPallet.bind( _shipment ),
    };

    const editFields = {
      expected: [
        'handle',
        'units',
        'category'
      ],
      received: [
        'handle',
        'hasProblem',
        'note'
      ],
    };

    function DisplayPallet( _shipment, _type, _data ) {

      const savePallet = saveFn[ _type ]( _shipment );

      const pallet = Object.assign({}, _data);

      if( _type === 'received' ) {
        pallet.showNote = false;
        pallet.toggleShowNote = function() { this.showNote = !this.showNote; };
      }

      
      pallet.isEdited = function( ) {

        for( let field of editFields[ _type ] ) {
          if( this.editValues[ field ] !== this[ field ] ) {
            return true;
          }
        }

        return false;
      };

      pallet.cloneEditFields = function() {
        const res = {};
        for( let field of editFields[ _type ] ) {
          res[ field ] = this[ field ];
        }
        return res;
      };

      pallet.openEdit = function( ) {
        this.editValues = this.cloneEditFields();
        this.isEditing = true;
      };
      
      pallet.closeEdit = function( ) {
        this.isEditing = false;
        delete this.editValues;
      };
      
      pallet.saveEdit = function( ) {
        this.isEditing = false;
        let p;

        if( pallet.isEdited() ) {

          p = savePallet( this._id, this.editValues )
            .then( resp => {
              if( resp.success ) {
                return Object.assign( this, this.editValues );
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

        return p.then( _ => this.closeEdit() );
      };

      return pallet;
    }

    return DisplayPallet;
  }]);

