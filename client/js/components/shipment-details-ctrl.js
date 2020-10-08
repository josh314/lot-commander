import angular from 'angular';


/******************* Shipment Details Page Controller *************************/
angular.module('myApp').controller('ShipmentDetailsCtrl', [ 'ConfirmationModal', 'focus', 'LoggedInUser', 'messageModal', 'navigate', 'palletCategories', 'DisplayPalletFactory', 'sessionTimeout', 'ShipmentManagerSvc',
  function( ConfirmationModal, focus, LoggedInUser, messageModal, navigate, palletCategories, DisplayPalletFactory, sessionTimeout, ShipmentManagerSvc ) {

    /****************************************************
     * View variables
     * ==============
     *
     ****/

    const vm = this;
    vm.shipment = {};

    vm.showEditControls = LoggedInUser.hasPermission('EDIT_INCOMING_SHIPMENT');
    vm.showReceiveControls = LoggedInUser.hasPermission('RECEIVE_INCOMING_SHIPMENT');
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
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

    vm.receiveShipment = receiveShipment;
    vm.unreceiveShipment = unreceiveShipment;
    vm.receivePallet = receivePallet;
    vm.unreceivePallet = unreceivePallet;

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
        p = ShipmentManagerSvc.editShipment( )( { [ key ]: vm.editValue[ key ] } )
          .then( resp => {
            if( resp.success ) {
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
          return ShipmentManagerSvc.removeShipment().then( _ => {
            navigate.shipmentList();
          });
        }
      } );
    }

    function removeExpectedPallet( idx ) {

      const pallet = vm.shipment.palletsExpected[ idx ];

      ShipmentManagerSvc.removeExpectedPallet()( pallet._id )
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

      return ShipmentManagerSvc.addExpectedPallet()( this.data )
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
     * Pallet editing functionality
     * ============================
     * 
     *******/

    /* eslint-disable angular/controller-as-vm */
    // function registerPalletEditingHandlers( pallet ) {
    //   pallet.openEdit = function( ) {
    //     this.editValues = JSON.parse( JSON.stringify( this ) );
    //     this.isEditing = true;
    //   };
    //   pallet.closeEdit = function( ) {
    //     this.isEditing = false;
    //     delete this.editValues;
    //   };
    //   pallet.saveEdit = function( ) {

    //     this.isEditing = false;
    //     let p;

    //     if( this.editValues.handle !== this.handle ||
    //         this.editValues.units !== this.units ||
    //         this.editValues.category !== this.category ) {

    //       p = ShipmentManagerSvc.editExpectedPallet()( this._id, this.editValues )
    //         .then( resp => {
    //           if( resp.success ) {
    //             return Object.assign( this, this.editValues );
    //           }
    //           else {
    //             throw new Error(resp.error);
    //           }
    //         })
    //         .catch( _e => {
    //           return messageModal.launch({header: 'Failure', body: 'Server Error', type: 'error'});
    //         });

    //     }
    //     else {

    //       p = Promise.resolve( true );

    //     }

    //     p.then( _ => this.closeEdit() );
    //   };
    // }
    /* eslint-enable */

    /*******************************************************
     * Documents
     * =========
     * 
     *******/

    const updateDocumentList = () => {

      ShipmentManagerSvc.listShipmentDocuments().then( documents => {

        if( documents ) {
          Object.assign( vm, { documents } );
        }

      });

    };

    function uploadDocument() {
      if(!vm.documentToUpload) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      const document = vm.documentToUpload;

      vm.waitingForResponse = true;
      ShipmentManagerSvc.uploadShipmentDocument()( document ).then( _ => {
        updateDocumentList();
        vm.waitingForResponse = false;
      });

    }

    function removeDocument( documentName ) {
      ShipmentManagerSvc.removeShipmentDocument()( documentName ).then( _ => {
        updateDocumentList();
      });
    }


    /*******************************************************
     * Receiving
     * =========
     * 
     *******/

    function receiveShipment() {

      return ShipmentManagerSvc.receiveShipment().then( _response => {

        return loadShipment().then( _response => {

          focus('receivedPalletIdInput');

        });

      });

    }

    function unreceiveShipment() {

      return ShipmentManagerSvc.unreceiveShipment().then( _response => {

        return loadShipment();

      });

    }

    function receivePallet() {

      if( vm.receivedPalletId ) {

        const found = vm.shipment.palletsReceived.find( p => p.handle === vm.receivedPalletId );

        if( found ) {
          //TODO: warning of duplicate
          return;
        }

        return ShipmentManagerSvc.receivePallet()( { handle: vm.receivedPalletId } ).then( _response => {

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

      return ShipmentManagerSvc.unreceivePallet()( pallet._id ).then( _response => {
        return loadShipment();
      });

    }
 
    /*******************************************************
     * Initialization
     * ==============
     * 
     *******/

    function loadShipment() {
      return ShipmentManagerSvc.loadShipment( ).then( shipment => {

        Object.assign(vm.shipment, shipment);

        vm.shipment.palletsExpected = shipment.palletsExpected.map( p => DisplayPalletFactory( 'expected', p ) );
        vm.shipment.palletsReceived = shipment.palletsReceived.map( p => DisplayPalletFactory( 'received', p ) );

      });
    }

    const init = () => {

      sessionTimeout.timeoutExpired();

      loadShipment();

      updateDocumentList();

    };

    // init the page
    init();
  }]);

/******************* Constrcutor for Pallet Objects *************************/
angular.module('myApp').factory('DisplayPalletFactory', [ 'messageModal', 'ShipmentManagerSvc',
  function( messageModal, ShipmentManagerSvc ) {

    const saveFn = {
      expected: ShipmentManagerSvc.editExpectedPallet(),
      received: ShipmentManagerSvc.editReceivedPallet(),
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

    function DisplayPallet( _type, _data ) {

      const savePallet = saveFn[ _type ];

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

