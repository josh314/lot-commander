import angular from 'angular';
import {
  isUpce,
  upce2upca,
} from '../../upc';

const __PAGE_SIZE__ = 5;

class MyError extends Error {
  constructor(message) {
    super(message);
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    //  @see Node.js reference (bottom)
    Error.captureStackTrace(this, this.constructor);
  }
}

class RepackError extends MyError {
  constructor( { message, alertType } ) {
    super(message);
    this.alertType = alertType;
  }
}

/******************* Pallet Edit Manifest Controller *************************/
angular.module('myApp').controller( 'InventoryPalletRepackCtrl', [

  'AudioAlertSvc',
  'focus',
  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletManifestSvc',
  'palletProperties',
  'sessionTimeout',
  'StandardManifestColumnsConst',

  function(

    AudioAlertSvc,
    focus,
    InventoryPalletManagerSvc,
    LoggedInUser,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletManifestSvc,
    palletProperties,
    sessionTimeout,
    StandardManifestColumnsConst,

  ) {

    const vm = this;
    init();

    const __BARCODE__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_BARCODE_COLUMN__;
    const __QUANTITY__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_QUANTITY_COLUMN__;
    const __DESCRIPTION__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_DESCRIPTION_COLUMN__;
    const __RETAIL_PRICE__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__;
    const __SALE_PRICE__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__;
    const __CATEGORY__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_CATEGORY_COLUMN__;

    async function init() {

      sessionTimeout.timeoutExpired();
      focus('palletHandleFilterInput');
      vm.standardManifestColumns = StandardManifestColumnsConst;

      vm.pagination = {
        current: 1,
        totalItems: 0,
        pageSize: __PAGE_SIZE__,
        pageChange: refreshPalletsList,
        maxSize: 8
      };

      vm.filter = {
        handle: '',
        populateShipment: true,
        shipmentHandle: '',
        isBrokendown: false,
        toBeListed: true,
      };
      vm.categoryOptions = [ "" ].concat( palletProperties.category );
      vm.conditionOptions = [ "" ].concat( palletProperties.condition );
      vm.palletsList = [];
      vm.columns = InventoryPalletManagerSvc.getListColumns( [ 'handle', 'shipment', 'repackPallet', 'createdAt' ] );
      vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');

      vm.removedItems = [];
      vm.removedItemEdits = new Map();
      vm.isEditingRemovedItem = isEditingRemovedItem;
      vm.editRemovedItem = editRemovedItem;
      vm.saveRemovedItemEdit = saveRemovedItemEdit;
      vm.cancelRemovedItemEdit = cancelRemovedItemEdit;

      vm.repackPallet = loadPallet;
      vm.refreshPalletsList = refreshPalletsList;
      vm.removeItem = removeItem;
      vm.undoRemoveItem = undoRemoveItem;
      vm.save = save;
      vm.finish = finish;
      vm.cancel = cancel;

      vm.palletId = InventoryPalletManagerSvc.getPalletId();
      if( vm.palletId ) {
        vm.pallet = await InventoryPalletManagerSvc.get( vm.palletId, { populate: [ 'shipment' ] } );
        await vm.pallet.documentsAreLoaded;
        loadPallet( vm.pallet );
      }

      vm.totalUnitsRemoved = () => vm.removedItems.reduce( (acc,item) => acc + item.numRemoved, 0 );
    }

    function getDisplayItem( barcode ) {
      let displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numRemoved + 1 <= _r[ __QUANTITY__ ] );

      if( !displayItem && isUpce( barcode ) ) { // for UPC-E, try again with the equivalent UPC-A

        barcode = upce2upca( barcode );
        displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numRemoved + 1 <= _r[ __QUANTITY__ ] );

      }
      return displayItem;
    }

    function __removeItem( displayItem ) {

      const barcode = displayItem[ __BARCODE__ ];

      let removedItem;

      const alreadyDecrementedItemIdx = vm.removedItems.findIndex( _item => _item[ __BARCODE__ ] === barcode );
      if( alreadyDecrementedItemIdx > -1 ) {

        // removedItem already exists. Splice it out of the vm.removedItems array.
        [ removedItem ] = vm.removedItems.splice( alreadyDecrementedItemIdx, 1 );
        removedItem.numRemoved += 1;

      }
      else {

        // new removedItem
        removedItem = {
          numRemoved: 1,
          [ __BARCODE__ ]: displayItem[ __BARCODE__ ],
          [ __DESCRIPTION__ ]: displayItem[ __DESCRIPTION__ ],
        };

        if( displayItem[ __CATEGORY__ ] ) {
          removedItem[ __CATEGORY__ ] = displayItem[ __CATEGORY__ ];
        }

        const quantity = displayItem[ __QUANTITY__ ];

        const retailPrice = displayItem[ __RETAIL_PRICE__ ];
        if( retailPrice ) {
          removedItem.unitRetailPrice = retailPrice / quantity;
        }

        const salePrice = displayItem[ __SALE_PRICE__ ];
        if( salePrice ) {
          removedItem.unitSalePrice = salePrice / quantity;
        }

      }

      // put `removedItem` at the top of the vm.removedItems array to allow user better visibility of what they just removed.
      vm.removedItems = [ removedItem ].concat( vm.removedItems );

      displayItem.numRemoved += 1;

    }

    function removeItem( barcode ) {

      if( !barcode ) {
        barcode = vm.scannedBarcode;
      }

      try {

        if( !barcode ) {
          throw new RepackError( { alertType: 'warning', message: `No barcode submitted.` } );
        }

        const displayItem = getDisplayItem( barcode );

        if( !displayItem ) {
          throw new RepackError( { alertType: 'fail', message: `Cannot remove item with barcode ${barcode} from this manifest.` } );
        }

        __removeItem( displayItem );

        AudioAlertSvc.success();

      }
      catch (e) {
        if( e.alertType === 'warning' ) {
          AudioAlertSvc.warning();
        }
        else if ( e.alertType === 'fail' ) {
          AudioAlertSvc.fail();
        }
        ModalSvc.message( { header: 'Error', body: e.message, type: 'error' } );
      }

      vm.scannedBarcode = '';

    }

    function removeItemMultipleQuantity( barcode, numItemsToRemove ) {

      let displayItems = vm.manifestDisplayRows.filter( _r => _r[ __BARCODE__ ]  === barcode );

      if( !displayItems.length && isUpce( barcode ) ) { // for UPC-E, try again with the equivalent UPC-A

        barcode = upce2upca( barcode );
        displayItems = vm.manifestDisplayRows.filter( _r => _r[ __BARCODE__ ]  === barcode );

      }

      const totalNumItemsAvailableToRemove = displayItems.reduce( ( _total, _r ) => _total + _r[ __QUANTITY__ ] - _r.numRemoved, 0 );

      if( numItemsToRemove > totalNumItemsAvailableToRemove ) {
        AudioAlertSvc.fail();
        ModalSvc.message( { header: 'Error', body: `Fewer than ${numItemsToRemove} items with barcode ${ barcode } left to remove.`, type: 'error' } );
        return;
      }

      let furtherItemsToRemove = numItemsToRemove;
      for( let i=0; i<displayItems.length; i++ ) {

        const currentDisplayItem = displayItems[ i ];

        const numItemsAvailableToRemoveFromCurrentDisplayItem =  currentDisplayItem[ __QUANTITY__ ] - currentDisplayItem.numRemoved;

        const numItemsToRemoveFromCurrentDisplayItem = Math.min( furtherItemsToRemove, numItemsAvailableToRemoveFromCurrentDisplayItem );

        for( let j=0; j<numItemsToRemoveFromCurrentDisplayItem; j++ ) {
          __removeItem( currentDisplayItem );
        }

        furtherItemsToRemove -= numItemsToRemoveFromCurrentDisplayItem;

        if( furtherItemsToRemove <= 0 ) {
          break;
        }

      }

    }

    function isEditingRemovedItem( removedItem ) {

      const barcode = removedItem[ __BARCODE__ ];

      return !!vm.removedItemEdits.get( barcode );

    }

    function editRemovedItem( removedItem ) {

      const barcode = removedItem[ __BARCODE__ ];
      const removedItemEdit = vm.removedItemEdits.get( barcode );

      if( !removedItemEdit ) {
        vm.removedItemEdits.set( barcode, { numRemoved: removedItem.numRemoved } );
      }

    }

    function saveRemovedItemEdit( removedItem ) {

      const barcode = removedItem[ __BARCODE__ ];
      const removedItemEdit = vm.removedItemEdits.get( barcode );

      if( removedItemEdit ) {

        const editDifference = removedItemEdit.numRemoved - removedItem.numRemoved;

        if( editDifference > 0 ) {
          removeItemMultipleQuantity( barcode, editDifference );
        }
        else if ( editDifference < 0 ) {

          for( let i=0; i<-editDifference ; i++ ) {
            undoRemoveItem( barcode );
          }

        }

        vm.removedItemEdits.delete( barcode );
      }

    }

    function cancelRemovedItemEdit( removedItem ) {

      const barcode = removedItem[ __BARCODE__ ];
      const removedItemEdit = vm.removedItemEdits.get( barcode );

      if( removedItemEdit ) {
        vm.removedItemEdits.delete( barcode );
      }

    }

    function undoRemoveItem( barcode ) {

      const removedItem = vm.removedItems.find( _item => _item[ __BARCODE__ ] === barcode );

      const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numRemoved > 0 );
      if( displayItem ) {

        if( displayItem.numRemoved >= 0 ) {
          displayItem.numRemoved -= 1;
        }

        if( removedItem.numRemoved > 1 ) {
          removedItem.numRemoved -= 1;
        }
        else if ( removedItem.numRemoved === 1 ) { // delete from the removed items list if numRemoved was only 1
          const removedItemIdx = vm.removedItems.findIndex( _item => _item === removedItem );
          vm.removedItems.splice( removedItemIdx, 1 );
        }

      }

    }

    function loadPallet( pallet ) {

      vm.pallet = pallet;
      if( vm.pallet.isRepacked ) {
        return ModalSvc.message( { header: 'Error', body: `Pallet ${pallet.handle} has already been repacked.`, type: 'error' }).then( _ => navigate.repackPallet() );
      }

      vm.manifestFilename = angular.isArray(pallet.documents) && pallet.documents[0] ? pallet.documents[0].name : null;
      if( !vm.manifestFilename ) {
        return ModalSvc.message({ header: 'Error', body: `No manifest for pallet ${pallet.handle}.`, type: 'error' });
      }

      pallet.getDocument( vm.manifestFilename ).then( data => {

        ManifestFileHandlerSvc.parse( data, vm.manifestFilename, { skipLastRows: 1 } ); //note we are assuming the last row is a totals row

        const manifest = ManifestFileHandlerSvc.getActiveManifest();

        if( manifest ) {
          vm.manifest = manifest;
          if( vm.pallet.removedItems ) {
            vm.removedItems = JSON.parse( JSON.stringify( vm.pallet.removedItems ) );
          }

          const sheet = vm.manifest.getActiveSheet();
          for( let _item of vm.removedItems ) {

            const barcode = _item[ __BARCODE__ ];

            if( sheet.getLineItemByBarcode( barcode ) ) {
              sheet.addLineItemQuantity( barcode, _item.numRemoved );
            }
            else{
              // add back in line items that were completely removed

              const newRow = {
                [ __BARCODE__ ]: _item[ __BARCODE__ ],
                [ __DESCRIPTION__ ]: _item[ __DESCRIPTION__ ],
                [ __QUANTITY__ ]: _item.numRemoved,
              };

              if( _item.unitRetailPrice ) {
                newRow[ __RETAIL_PRICE__ ] = _item.unitRetailPrice * newRow[ __QUANTITY__ ];
              }

              if( _item.unitSalePrice ) {
                newRow[ __SALE_PRICE__ ] = _item.unitSalePrice * newRow[ __QUANTITY__ ];
              }

              if( _item[ __CATEGORY__ ] ) {
                newRow[ __CATEGORY__ ] = _item[ __CATEGORY__ ];
              }

              sheet.rows.push( newRow );
            }

          }

          vm.manifestDisplayRows = getDisplayRowsFromManifest( manifest );

          if( vm.removedItems ) {
            vm.removedItems.forEach( _removedItem => {
              const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === _removedItem[ __BARCODE__ ] );
              if( displayItem ) {
                displayItem.numRemoved += _removedItem.numRemoved;
              }
            });
          }

        }

      });
    }

    function getDisplayRowsFromManifest( manifest ) {

      const sheet = manifest.getActiveSheet();

      let rows;
      if( sheet ) {

        rows = JSON.parse( JSON.stringify( sheet.rows ) );
        rows.forEach( _r => _r.numRemoved = 0 );

      }

      return rows || [];
    }

    function refreshPalletsList() {

      const filter = vm.filter;

      return InventoryPalletManagerSvc.count( filter ).then( count => {
        vm.pagination.totalItems = count;

        const pagedQueryOptions = {
          filter,
          sort: {
            key: 'createdAt',
            ascending: false
          },
          num: __PAGE_SIZE__,
          page: vm.pagination.current,
        };

        return InventoryPalletManagerSvc.list( pagedQueryOptions ).then( pallets => {

          pallets.forEach( p => {
            p.toggleShowNote = () => p.showNote = !p.showNote;
          });

          vm.palletsList = pallets;
        });

      });

    }

    function cmpRemovedItems( a, b ) {
      if( a[ __BARCODE__ ] < b[ __BARCODE__ ] ) {
        return -1;
      }
      else if ( a[ __BARCODE__ ] > b[ __BARCODE__ ] ) {
        return 1;
      }
      else if( a[ __DESCRIPTION__ ] < b[ __DESCRIPTION__ ] ) {
        return -1;
      }
      else {
        return 1;
      }
    }

    function removedItemsUnchanged() {
      const arr1 = vm.pallet.removedItems.slice().sort( cmpRemovedItems );
      const arr2 = vm.removedItems.slice().sort( cmpRemovedItems );

      if( JSON.stringify(arr1) === JSON.stringify(arr2) ) {
        return true;
      }
      else {
        return false;
      }

    }


    async function __save() {

      if( !removedItemsUnchanged() ) {

        // Apply the changes from vm.removedItems to vm.manifest.sheet
        const sheet = vm.manifest.getActiveSheet();
        for( let _item of vm.removedItems ) {

          sheet.removeLineItemQuantity( _item[ __BARCODE__ ], _item.numRemoved );

        }

        const file = ManifestFileHandlerSvc.createFile( vm.manifestFilename, vm.manifest, true );

        const palletTotals = vm.manifest.standardTotals();

        const editValues = {
          units: palletTotals.quantity,
          removedItems: vm.removedItems,
          retailValue: palletTotals.retailValue,
          salePrice: palletTotals.salePrice,
        };

        // Only update the received pallet manifest
        await ModalSvc.wait( {
          waitFor: PalletManifestSvc.uploadReceivedPalletManifest( vm.pallet, file, editValues ),
          delay: 2000
        } );

      }

    }


    async function save() {

      //  popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Save progress?',
        html: `<p>This will save your current work, but will not finish the repacking process.</p>
                <p>You may return to repacking this pallet at a later time.</p>
                <p><strong>Continue?</strong></p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      await __save();

      await ModalSvc.message( {
        header: 'Saved.',
        body: `Successfully saved removed items.`
      } );

    }


    async function finish() {

      //  popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Finish repacking?',
        html: `<p>Finishing this pallet will close the editor, save any changes to the manifest, and marked the pallet as repacked.</p>
                <p>You will not be able to return to repacking this pallet. If you will need to return to finish repacking this pallet later, use the <strong>Save progress</strong> button instead.</p>
                <p><strong>Finish this pallet?</strong></p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      await __save();

      await vm.pallet.repack( true );
      await ModalSvc.message( { header: 'Repacking complete', body: `Successfully saved changes and marked pallet as repacked.` } );

      if( vm.pallet.shipment && vm.pallet.shipment._id ) {
        navigate.shipmentDetails( vm.pallet.shipment._id );
      }
      else {
        navigate.inventoryPalletView();
      }

    }

    async function cancel() {
      // popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Cancel repacking?',
        html: '<p>This will close the editor without saving any changes or marking the pallet as repacked.</p><p>Continue?</p>',
      });

      if( !isConfirmed ) {
        return;
      }

      vm.pallet = null;
      vm.manifest = null;
    }

  }
]);