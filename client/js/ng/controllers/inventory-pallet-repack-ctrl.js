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

  ) {

    const vm = this;
    init();

    async function init() {

      sessionTimeout.timeoutExpired();
      focus('palletHandleFilterInput');

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

    }

    function removeItem() {

      const barcode = vm.barcodeToDecrement;

      if( barcode ) {

        const displayItem = vm.manifestDisplayRows.find( _r => _r.barcode === barcode );

        if( displayItem ) {

          if( displayItem.numRemoved + 1 <= displayItem.quantity ) {

            if( displayItem.numRemoved === 0 ) {

              const removedItem = {
                barcode,
                description: displayItem.description,
                numRemoved: 1,
              };

              vm.removedItems.push( removedItem );

            }
            else {

              const alreadyDecrementedItem = vm.removedItems.find( _item => _item.barcode === barcode );
              alreadyDecrementedItem.numRemoved += 1;

            }

            displayItem.numRemoved += 1;

            AudioAlertSvc.success();

          }
          else {
            AudioAlertSvc.fail();
            ModalSvc.message({ header: 'Error', body: `Cannot remove any more of item with barcode ${barcode} from this manifest.`, type: 'error' });
          }

        }
        else {
          AudioAlertSvc.fail();
          ModalSvc.message({ header: 'Error', body: `Item with barcode ${barcode} not found in this manifest.`, type: 'error' });
        }

      }
      else {
        AudioAlertSvc.warning();
        ModalSvc.message({ header: 'Error', body: `No barcode submitted.`, type: 'error' });
      }

      vm.barcodeToDecrement = '';

    }

    function undoRemoveItem( barcode ) {

      if( barcode ) {

        const displayItem = vm.manifestDisplayRows.find( _r => _r.barcode === barcode );
        const removedItemIdx = vm.removedItems.findIndex( _item => _item.barcode === barcode );

        if( displayItem && removedItemIdx > -1 ) {

          if( displayItem.numRemoved >= 0 ) {
            displayItem.numRemoved -= 1;
          }

          const removedItem = vm.removedItems[ removedItemIdx ];
          if( removedItem.numRemoved > 1 ) {
            removedItem.numRemoved -= 1;
          }
          else if ( removedItem.numRemoved === 1 ) { // delete from the removed items list if numRemoved was only 1
            vm.removedItems.splice( removedItemIdx, 1 );
          }

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
          vm.manifestDisplayRows = getDisplayRowsFromManifest( manifest );
        }

      });
    }

    function getDisplayRowsFromManifest( manifest ) {

      const sheet = manifest.getActiveSheet();

      let rows;
      if( sheet ) {

        const barcodeColumn = sheet.getBarcodeColumn();
        const quantityColumn = sheet.getQuantityColumn();
        const descriptionColumn = sheet.getDescriptionColumn();

        rows = sheet.rows.map( _r => ({
          barcode: _r[ barcodeColumn.name ],
          quantity: _r[ quantityColumn.name ],
          description: _r[ descriptionColumn.name ],
          numRemoved: 0,
        }) );

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
      if(vm.removedItems.length ) {

        // Apply the changes from vm.removedItems to vm.manifest.sheet
        const sheet = vm.manifest.getActiveSheet();
        for( let _item of vm.removedItems ) {

          sheet.adjustLineItemQuantity( _item.barcode, - _item.numRemoved );

        }

        const file = ManifestFileHandlerSvc.createFile( vm.manifestFilename, vm.manifest, true );

        const palletTotals = vm.manifest.standardTotals();

        const numUnitsRemoved = vm.removedItems.reduce( ( acc, _item ) => acc + _item.numRemoved , vm.pallet.numUnitsRemoved || 0 );

        const editValues = {
          units: palletTotals.quantity,
          numUnitsRemoved,
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
      else {
        finishedMessage = `Marked pallet as repacked.`;
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