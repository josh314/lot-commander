import angular from 'angular';

const __PAGE_SIZE__ = 5;

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

      vm.repackPallet = loadPallet;
      vm.refreshPalletsList = refreshPalletsList;
      vm.removeItem = removeItem;
      vm.undoRemoveItem = undoRemoveItem;
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

    function removeItem() {

      const barcode = vm.barcodeToDecrement;

      if( barcode ) {

        const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numRemoved + 1 <= _r[ __QUANTITY__ ] );

        if( displayItem ) {

          const alreadyDecrementedItem = vm.removedItems.find( _item => _item[ __BARCODE__ ] === barcode );
          if( alreadyDecrementedItem ) {
            alreadyDecrementedItem.numRemoved += 1;
          }
          else {

            const removedItem = {
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

            vm.removedItems.push( removedItem );

          }

          displayItem.numRemoved += 1;

          AudioAlertSvc.success();

        }
        else {
          AudioAlertSvc.fail();
          ModalSvc.message({ header: 'Error', body: `Cannot remove item with barcode ${barcode} from this manifest.`, type: 'error' });
        }

      }
      else {
        AudioAlertSvc.warning();
        ModalSvc.message({ header: 'Error', body: `No barcode submitted.`, type: 'error' });
      }

      vm.barcodeToDecrement = '';

    }

    function undoRemoveItem( removedItem ) {

      const barcode = removedItem[ __BARCODE__ ] ;

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
              sheet.adjustLineItemQuantity( barcode, _item.numRemoved );
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
        return 1;
      }
      else if ( a[ __BARCODE__ ] > b[ __BARCODE__ ] ) {
        return -1;
      }
      else if( a[ __DESCRIPTION__ ] < b[ __DESCRIPTION__ ] ) {
        return 1;
      }
      else {
        return -1;
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

    async function finish() {

      //  popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Finish and Save Manifest?',
        html: '<p>This will close the editor and save any changes to the manifest.</p><p>Continue?</p>',
      });

      if( !isConfirmed ) {
        return;
      }

      let finishedMessage;
      if( removedItemsUnchanged() ) {
        finishedMessage = `Marked pallet as repacked.`;
      }
      else {

        // Apply the changes from vm.removedItems to vm.manifest.sheet
        const sheet = vm.manifest.getActiveSheet();
        for( let _item of vm.removedItems ) {

          sheet.adjustLineItemQuantity( _item[ __BARCODE__ ], - _item.numRemoved );

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

        finishedMessage = `Successfully saved new manifest and marked pallet as repacked.`;
      }

      await vm.pallet.repack( true );
      await ModalSvc.message( { header: 'Repacking complete', body: finishedMessage } );
      navigate.reload();

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