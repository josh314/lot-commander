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

class SplitPalletError extends MyError {
  constructor( { message, alertType } ) {
    super(message);
    this.alertType = alertType;
  }
}

function isHandleShipmentPalletDuplicate( handle, shipment ) {

  if( shipment ) {

    for ( let rp of shipment.palletsReceived ) {

      if( rp.handle === handle ) {
        return true;
      }

    }

    for ( let cp of shipment.palletsConsolidated ) {

      if( cp.handle === handle ) {
        return true;
      }

    }

  }

  return false;
}

/******************* Pallet Split Controller *************************/
angular.module('myApp').controller( 'InventoryPalletSplitCtrl', [

  'AudioAlertSvc',
  'CounterSvc',
  'dbEnums',
  'FinishSplitPalletModal',
  'focus',
  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletManifestSvc',
  'palletProperties',
  'PrintSvc',
  'sessionTimeout',
  'ShipmentFactory',
  'ShippingItemsSvc',
  'StandardManifestColumnsConst',

  function(

    AudioAlertSvc,
    CounterSvc,
    dbEnums,
    FinishSplitPalletModal,
    focus,
    InventoryPalletManagerSvc,
    LoggedInUser,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletManifestSvc,
    palletProperties,
    PrintSvc,
    sessionTimeout,
    ShipmentFactory,
    ShippingItemsSvc,
    StandardManifestColumnsConst,

  ) {


    class DisplaySplitGroup {
      constructor( { _id, label, lotNumber, items = [], condition, category, toBeListed, packagingType = 'box lot', shippingItems = [], } ) {

        Object.assign(
          this,
          {
            _id,
            items,
            condition,
            category,
            toBeListed,
            packagingType,
            shippingItems,
            lotNumber,

            isEditingLabel: false,
            itemEdits: new Map(),
          }
        );

        if( typeof condition === 'undefined' ) {
          this.condition = vm.pallet.condition;
        }

        if( typeof category === 'undefined' ) {
          this.category = vm.pallet.category;
        }

        if( typeof toBeListed === 'undefined' ) {
          this.toBeListed = vm.pallet.toBeListed;
        }

        this.setLabel( label );
      }

      // get the data
      getData() {
        return {
          _id: this._id,
          handle: this.handle,
          lotNumber: this.lotNumber,
          label: this.label,
          condition: this.condition,
          category: this.category,
          toBeListed: this.toBeListed,
          items: this.items,
          packagingType: this.packagingType,
          shippingItems: this.shippingItems,
        };
      }

      setLabel( label ) {

        this.label = label;
        this.handle = splitGroupLabel2PalletHandle( this.label );

      }

      totalUnits() {
        return this.items.reduce( ( total, item ) => total + item.numSplit, 0 );
      }

      // Edit the label
      startEditingLabel() {
        this.isEditingLabel = true;
        this.labelEditValue = this.label;
      }
      saveLabelEdit() {
        this.isEditingLabel = false;

        // check against other split groups
        const existingGrpWithEditLabel = vm.displaySplitGroups.find( _ => _.label === this.labelEditValue );

        if( existingGrpWithEditLabel ) {

          return ModalSvc.message( {
            header: 'Error',
            html: `<p>There already exists a split-group with the label <strong>${ this.labelEditValue }</strong>. Please choose another label.</p>`,
            type: 'error'
          } );

        }

        // check against other shipment pallets

        const handle = splitGroupLabel2PalletHandle( this.labelEditValue );
        if( isHandleShipmentPalletDuplicate( handle, vm.pallet.shipment ) ) {

          return ModalSvc.message( {
            header: 'Error',
            html: `<p>The label <strong>${ this.labelEditValue }</strong> will clash with the name of another pallet in this shipment. Please choose another label.</p>`,
            type: 'error'
          } );

        }

        this.setLabel( this.labelEditValue );

      }
      cancelLabelEdit() {
        this.isEditingLabel = false;
        this.labelEditValue = this.label;
      }


      splitItem( displayItem ) {

        const barcode = displayItem[ __BARCODE__ ];

        let splitItem;

        const alreadyDecrementedItemIdx = this.items.findIndex( _item => _item[ __BARCODE__ ] === barcode );
        if( alreadyDecrementedItemIdx > -1 ) {

          // splitItem already exists. Splice it out of the this.items array.
          [ splitItem ] = this.items.splice( alreadyDecrementedItemIdx, 1 );
          splitItem.numSplit += 1;

        }
        else {

          // new splitItem
          splitItem = {
            numSplit: 1,
            [ __BARCODE__ ]: displayItem[ __BARCODE__ ],
            [ __DESCRIPTION__ ]: displayItem[ __DESCRIPTION__ ],
          };

          if( displayItem[ __CATEGORY__ ] ) {
            splitItem[ __CATEGORY__ ] = displayItem[ __CATEGORY__ ];
          }

          const quantity = displayItem[ __QUANTITY__ ];

          const retailPrice = displayItem[ __RETAIL_PRICE__ ];
          if( retailPrice ) {
            splitItem.unitRetailPrice = retailPrice / quantity;
          }

          const salePrice = displayItem[ __SALE_PRICE__ ];
          if( salePrice ) {
            splitItem.unitSalePrice = salePrice / quantity;
          }

        }

        // put `splitItem` at the top of the this.items array to allow user better visibility of what they just removed.
        this.items = [ splitItem ].concat( this.items );

        displayItem.numSplit += 1;

      }

      undoSplitItem( barcode ) {

        const splitItem = this.items.find( _item => _item[ __BARCODE__ ] === barcode );

        const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numSplit > 0 );
        if( displayItem ) {

          if( displayItem.numSplit >= 0 ) {
            displayItem.numSplit -= 1;
          }

          if( splitItem.numSplit > 1 ) {
            splitItem.numSplit -= 1;
          }
          else if ( splitItem.numSplit === 1 ) { // delete from the split items list if numSplit was only 1
            const splitItemIdx = this.items.findIndex( _item => _item === splitItem );
            this.items.splice( splitItemIdx, 1 );
          }

        }

      }

      // edit the item valies
      isEditingItem( item ) {

        const barcode = item[ __BARCODE__ ];

        return !!this.itemEdits.get( barcode );

      }

      editItem( item ) {

        const barcode = item[ __BARCODE__ ];
        const itemEdit = this.itemEdits.get( barcode );

        if( !itemEdit ) {
          this.itemEdits.set( barcode, { numSplit: item.numSplit } );
        }

      }

      saveItemEdit( item ) {

        const barcode = item[ __BARCODE__ ];
        const itemEdit = this.itemEdits.get( barcode );

        if( itemEdit ) {

          const editDifference = itemEdit.numSplit - item.numSplit;

          if( editDifference > 0 ) {

            this.splitItemMultipleQuantity( barcode, editDifference );

          }
          else if ( editDifference < 0 ) {

            for( let i=0; i<-editDifference ; i++ ) {
              // NOTE: this is not a class method but a function defined with the controller
              // Note: make this class method?
              this.undoSplitItem( barcode );
            }

          }

          this.itemEdits.delete( barcode );
        }

      }

      cancelItemEdit( item ) {

        const barcode = item[ __BARCODE__ ];
        const itemEdit = this.itemEdits.get( barcode );

        if( itemEdit ) {
          this.itemEdits.delete( barcode );
        }

      }

      splitItemMultipleQuantity( barcode, numItemsToSplit ) {

        let manifestDisplayRow = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode );

        if( !manifestDisplayRow && isUpce( barcode ) ) { // for UPC-E, try again with the equivalent UPC-A

          barcode = upce2upca( barcode );
          manifestDisplayRow = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode );

        }

        const totalNumItemsAvailableToSplit =  manifestDisplayRow[ __QUANTITY__ ] - manifestDisplayRow.numSplit;

        if( numItemsToSplit > totalNumItemsAvailableToSplit ) {
          AudioAlertSvc.fail();
          ModalSvc.message( { header: 'Error', body: `Fewer than ${numItemsToSplit} items with barcode ${ barcode } left in original manifest.`, type: 'error' } );
          return;
        }

        for( let i=0; i<numItemsToSplit; i++ ) {
          this.splitItem( manifestDisplayRow );
        }

      }

      // TODO: deprecate
      editShippingItems() {

        const skipValidation = true;

        ModalSvc.shippingItems( this.shippingItems, skipValidation ).then( shippingItems => {
          if( shippingItems ) {
            this.shippingItems = shippingItems;
          }
        });
      }

      setShippingItems( shippingItems ) {
        if( shippingItems ) {
          this.shippingItems = shippingItems;
        }
      }

    }

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
      vm.packagingTypeOptions = [ "" ].concat( dbEnums.packagingType );


      vm.inputs = {
        barcode: '',
      };

      vm.currentSplitGroup = null;

      vm.palletsList = [];
      vm.columns = InventoryPalletManagerSvc.getListColumns( [ 'handle', 'shipment', 'splitPallet', 'createdAt' ] );
      vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');
      vm.showDeveloper = LoggedInUser.isDeveloper();

      vm.displaySplitGroups = [];
      vm.displaySplitGroupsSorted = [];

      Object.assign(
        vm,
        {

          openPackagingTypeInfo: ModalSvc.packagingTypeInfo.bind( ModalSvc ),
          toggleShowShippingItems,
          toggleShowPackagingType,
          toggleShowPrintLabelsControls,

          refreshPalletsList,
          splitPallet: loadPallet,

          splitGroupsUnchanged,
          totalUnitsSplit,

          // manage split groups
          newSplitGroup,
          bumpCurrentSplitGroup,

          splitItem,

          save,
          cancel,
          finish,

          printLabels,
        }
      );

      vm.showPackagingType = false;
      function toggleShowPackagingType() {
        vm.showPackagingType = !vm.showPackagingType;
      }

      vm.showShippingItems = false;
      function toggleShowShippingItems() {
        vm.showShippingItems = !vm.showShippingItems;
      }

      vm.showPrintLabelsControls = false;
      function toggleShowPrintLabelsControls() {
        vm.showPrintLabelsControls = !vm.showPrintLabelsControls;
      }

      vm.palletId = InventoryPalletManagerSvc.getPalletId();
      if( vm.palletId ) {
        vm.pallet = await InventoryPalletManagerSvc.get( vm.palletId, { populate: [ 'shipment', 'shipment.palletsReceived', 'shipment.palletsConsolidated' ] } );
        vm.pallet.shipment = ShipmentFactory( vm.pallet.shipment );
        await vm.pallet.documentsAreLoaded;
        loadPallet( vm.pallet );
      }

    }

    function newSplitGroup() {

      let proposedLabel = 1;
      while( vm.displaySplitGroups.find( _ => _.label === `${proposedLabel}` ) ) {
        proposedLabel++;
      }

      const data = {
        label: `${ proposedLabel }`,
        items: [],
        shippingItems: [],
      };

      const newDisplaySplitGroup = new DisplaySplitGroup( data );

      vm.displaySplitGroups.push( newDisplaySplitGroup );
      vm.displaySplitGroupsSorted = [ newDisplaySplitGroup ].concat( vm.displaySplitGroupsSorted );

      vm.currentSplitGroup = newDisplaySplitGroup;

    }

    function bumpCurrentSplitGroup() {

      const currentSplitGroupIdx = vm.displaySplitGroupsSorted.findIndex( grp => grp === vm.currentSplitGroup );

      if( currentSplitGroupIdx >= 0 ) {

        // remove the current split group
        vm.displaySplitGroupsSorted.splice( currentSplitGroupIdx, 1 );

        // and re-insert in front
        vm.displaySplitGroupsSorted.splice( 0, 0, vm.currentSplitGroup );

      }

    }

    function totalUnitsSplit() {

      return vm.displaySplitGroups.reduce( ( total, grp ) => total + grp.totalUnits() , 0 );

    }

    function getDisplayItem( barcode ) {
      let displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numSplit + 1 <= _r[ __QUANTITY__ ] );

      if( !displayItem && isUpce( barcode ) ) { // for UPC-E, try again with the equivalent UPC-A

        barcode = upce2upca( barcode );
        displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === barcode && _r.numSplit + 1 <= _r[ __QUANTITY__ ] );

      }
      return displayItem;
    }

    function splitItem( barcode ) {
      if( !barcode ) {
        barcode = vm.inputs.barcode;
      }

      try {

        if( !barcode ) {
          throw new SplitPalletError( { alertType: 'warning', message: `No barcode submitted.` } );
        }

        const displayItem = getDisplayItem( barcode );

        if( !displayItem ) {
          throw new SplitPalletError( { alertType: 'fail', message: `Cannot split out item with barcode ${barcode} from this manifest.` } );
        }

        vm.currentSplitGroup.splitItem( displayItem );

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

      vm.inputs.barcode = '';

    }

    function loadPallet( pallet ) {

      vm.pallet = pallet;
      if( vm.pallet.isBrokendown ) {
        return ModalSvc.message( { header: 'Error', body: `Pallet ${pallet.handle} is already broken down.`, type: 'error' }).then( _ => navigate.splitPallet() );
      }

      vm.manifestFilename = angular.isArray(pallet.documents) && pallet.documents[0] ? pallet.documents[0].name : null;
      if( !vm.manifestFilename ) {
        return ModalSvc.message({ header: 'Error', body: `No manifest for pallet ${pallet.handle}.`, type: 'error' });
      }

      PalletManifestSvc.loadPalletManifest( pallet, vm.manifestFilename ).then( manifest => {

        if( manifest ) {
          vm.manifest = manifest;
          if( vm.pallet.splitGroups ) {
            vm.displaySplitGroups = JSON.parse( JSON.stringify( vm.pallet.splitGroups ) ).map( _ => new DisplaySplitGroup( _ ) );

            if( vm.displaySplitGroups.length ) {
              vm.displaySplitGroupsSorted = vm.displaySplitGroups.map( _ => _ );
            }
            else {
              newSplitGroup();
            }

            vm.currentSplitGroup = vm.displaySplitGroups[0];
          }

          vm.manifestDisplayRows = getDisplayRowsFromManifest( manifest );

          if( vm.displaySplitGroups ) {

            for( let grp of vm.displaySplitGroups ) {

              if( grp.items ) {

                grp.items.forEach( _splitItem => {
                  const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === _splitItem[ __BARCODE__ ] );
                  if( displayItem ) {
                    displayItem.numSplit += _splitItem.numSplit;
                  }
                });

              }

            }

          }
        }

      });
    }

    function getDisplayRowsFromManifest( manifest ) {

      const sheet = manifest.getActiveSheet();

      let rows = [];
      if( sheet ) {

        const _rows = JSON.parse( JSON.stringify( sheet.rows ) );

        for( let _r of _rows ) {

          const existingRow = rows.find( row => row[ __BARCODE__ ] === _r[ __BARCODE__ ] );

          if( existingRow ) {
            existingRow[ __QUANTITY__ ] += _r[ __QUANTITY__ ];
            existingRow[ __RETAIL_PRICE__ ] += _r[ __RETAIL_PRICE__ ];
          }
          else {
            rows.push( _r );
          }

        }

        rows.forEach( _r => _r.numSplit = 0 );

      }

      rows.sort( (a,b) => a[ __RETAIL_PRICE__ ] > b[ __RETAIL_PRICE__ ] ? -1 : 1 );

      return rows;
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

    function cmpSplitGroupItems( a, b ) {
      if( a[ __BARCODE__ ] !== b[ __BARCODE__ ] ) {
        return a[ __BARCODE__ ] < b[ __BARCODE__ ] ? -1 : 1;
      }
      else if( a[ __DESCRIPTION__ ] !== b[ __DESCRIPTION__ ] ) {
        return a[ __DESCRIPTION__ ] < b[ __DESCRIPTION__ ] ? -1 : 1;
      }
      else {
        return 1;
      }
    }


    function areSplitGroupsBlank() {

      if( !vm.pallet || !vm.pallet.splitGroups || !vm.displaySplitGroups ) {
        return true;
      }

      // there is saved data on the pallet
      if( vm.pallet.splitGroups.length > 0 ) {
        false;
      }

      // at least one split group has items
      if( vm.displaySplitGroups.filter( _ => _.items.length ).length ) {
        return false;
      }

      // at least one split group has shipping items
      if( vm.displaySplitGroups.filter( _ => _.shippingItems.length ).length ) {
        return false;
      }

      // at least one split group has a set packagingTyoe
      if( vm.displaySplitGroups.filter( _ => _.packagingType ).length ) {
        return false;
      }

      return true;

    }

    function splitGroupsUnchanged() {

      if( areSplitGroupsBlank() ) {
        return true;
      }

      if( vm.pallet.splitGroups.length !== vm.displaySplitGroups.length ) {
        return false;
      }

      for( let i=0; i<vm.displaySplitGroups.length; i++ ) {

        const oldGrp = vm.pallet.splitGroups[i];
        const currentGrp = vm.displaySplitGroups[i];

        if( currentGrp.label !== oldGrp.label ) {
          return false;
        }

        if( currentGrp.packagingType !== oldGrp.packagingType ) {
          return false;
        }

        // .slice() performs shallow copy
        const items1 = oldGrp.items.slice().sort( cmpSplitGroupItems );
        const items2 = currentGrp.items.slice().sort( cmpSplitGroupItems );

        if( JSON.stringify(items1) !== JSON.stringify(items2) ) {
          return false;
        }

        // .slice() performs shallow copy
        const shippingItems1 = oldGrp.shippingItems.slice().sort( ShippingItemsSvc.compare.bind( ShippingItemsSvc ) );
        const shippingItems2 = currentGrp.shippingItems.slice().sort( ShippingItemsSvc.compare.bind( ShippingItemsSvc ) );

        if( JSON.stringify(shippingItems1) !== JSON.stringify(shippingItems2) ) {
          return false;
        }

      }

      return true;

    }

    function trimEmptySplitGroups() {

      vm.displaySplitGroups = vm.displaySplitGroups.filter( _grp => _grp.items.length );
      vm.displaySplitGroupsSorted = vm.displaySplitGroupsSorted.filter( _grp => _grp.items.length );

    }


    async function __saveProgress() {

      trimEmptySplitGroups();
      const editValues = {
        splitGroups: vm.displaySplitGroups.map( _ => _.getData() ),
      };

      const pallet = await ModalSvc.wait( {
        waitFor: vm.pallet.edit( editValues ),
        delay: 2000
      } );


      for( let splitGroup of vm.displaySplitGroups ) {

        // This updates the _id and/or lotNumber of any split groups that were created since the last save
        if( !splitGroup._id || !splitGroup.lotNumber ) {

          const match = pallet.splitGroups.find( _ => _.label === splitGroup.label );

          splitGroup._id = splitGroup._id || match._id;
          splitGroup.lotNumber = splitGroup.lotNumber || match.lotNumber;

        }

      }

      vm.pallet.splitGroups = JSON.parse( JSON.stringify( vm.displaySplitGroups ) );

      return pallet;

    }

    async function save() {

      //  popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Save progress?',
        html: `<p>This will save your current work, but will not finish the splitting process.</p>
                <p>You may return to splitting this pallet at a later time.</p>
                <p><strong>Continue?</strong></p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      await __saveProgress();

      await ModalSvc.message( {
        header: 'Saved.',
        body: `Successfully saved split items.`
      } );

    }

    async function createNewPalletFromSplitGroup( splitGroup ) {

      const { _id, label: _label, handle, lotNumber, items, condition, category, toBeListed, packagingType, shippingItems } = splitGroup.getData();
      const rows = convertSplitGroupItems2ManifestRows( items );

      let p;

      const manifest = new ManifestFileHandlerSvc.Manifest();
      const sheet = new ManifestFileHandlerSvc.Sheet(  {
        manifest,
        name: 'Data',
        rows
      } );
      manifest.addSheet( sheet );

      const newPalletProperties = {
        handle,
        lotNumber,
        condition,
        category,
        toBeListed,
        packagingType,
        shippingItems,
        splitFrom: vm.pallet._id,
      };

      if( vm.pallet.shipment ) {

        p = vm.pallet.shipment.addConsolidatedPallet( newPalletProperties );

      }
      else { // TODO: test this, although there is currently no ability to have orphaned pallets with manifests. This will change with merged manifests

        p = InventoryPalletManagerSvc.create( newPalletProperties );

      }

      const { shipment: _shipment , pallet, error, code: _code , message } = await p;

      if( error ) {
        throw new SplitPalletError( { message } );
      }

      const file = ManifestFileHandlerSvc.createFile( `${ handle }.xlsx`, manifest, true );

      const palletTotals = manifest.standardTotals();

      const editValues = {
        units: palletTotals.quantity,
        retailValue: palletTotals.retailValue,
        salePrice: palletTotals.salePrice,
      };

      // update the new pallet manifest
      await ModalSvc.wait( {
        waitFor: PalletManifestSvc.uploadInventoryPalletManifest( pallet, file, editValues ),
        delay: 2000
      } );

      return p;

    }

    async function createNewPallets() {

      const p = [];

      const leftoversSplitGroup = convertLeftovers2SplitGroup();

      const splitGroups = [
        new DisplaySplitGroup( {
          label: 'remaining',
          items: leftoversSplitGroup,
          shippingItems: [],
        }) ,
        ...vm.displaySplitGroups.filter( _ => _.items.length ),
      ];


      const { success } = await FinishSplitPalletModal.launch( vm.pallet, splitGroups );

      if( success ) {

        for( let group of splitGroups ) {

          if( group.items.length ) {
            p.push( createNewPalletFromSplitGroup( group ) );
          }

        }

        await Promise.all( p );

      }

      return { success };
    }

    function convertLeftovers2SplitGroup() {

      return vm.manifestDisplayRows.map(

        _displayRow => ({

          [ __BARCODE__ ] : _displayRow[ __BARCODE__ ],
          numSplit : _displayRow[ __QUANTITY__ ] - _displayRow.numSplit,
          unitRetailPrice : _displayRow[ __RETAIL_PRICE__ ] /_displayRow[ __QUANTITY__ ],
          [ __DESCRIPTION__ ] : _displayRow[ __DESCRIPTION__ ],

        })

      ).filter( _item => _item.numSplit );

    }

    function convertSplitGroupItems2ManifestRows( splitGroupItems ) {

      return splitGroupItems.map(

        _splitItem => ({

          [ __BARCODE__ ] : _splitItem[ __BARCODE__ ],
          [ __QUANTITY__ ] : _splitItem.numSplit,
          [ __CATEGORY__ ] : vm.pallet.category || '',
          [ __RETAIL_PRICE__ ] : _splitItem.numSplit  * _splitItem.unitRetailPrice,
          [ __DESCRIPTION__ ] : _splitItem[ __DESCRIPTION__ ],

        })

      ).filter( _item => _item[ __QUANTITY__ ] );

    }

    async function finish() {

      if( !vm.displaySplitGroups.filter( _ => _.items.length ).length ) {
        return ModalSvc.message({
          header: 'Error',
          body: `No items have been split from this pallet. There is nothing to save.`,
        });
      }

      //  popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Finish splitting?',
        html: `<p>Finishing this pallet will close the editor, mark this pallet as broken down, and create new pallets with manifests reflecting the splitting of products.
                ${ vm.pallet.shipment ? ` The new pallets will appear as consolidated pallets for shipment <strong>${vm.pallet.shipment.handle}</strong>.` : ''}</p>
                <p>You will not be able to return to splitting this pallet, although you may further split the newly created pallets.</p>
                <p>If you will need to return to splitting this pallet later, use the <strong>Save progress</strong> button instead.</p>
                <p><strong>Finish this pallet?</strong></p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      // save the final splitGroups
      await __saveProgress();

      // create new consolidated pallets
      const { success } = await createNewPallets();

      if( success ) {

        //  mark pallet as broken-down
        await vm.pallet.breakdown( true );

        await ModalSvc.message( { header: 'Splitting complete', body: `Successfully created new split pallets.` } );

        if( vm.allowShipmentNavigation && vm.pallet.shipment && vm.pallet.shipment._id ) {
          navigate.shipmentDetails( vm.pallet.shipment._id );
        }
        else {
          navigate.splitPallet();
        }

      }

    }

    async function cancel() {
      // popup to ask if they're finished
      const isConfirmed = await ModalSvc.confirm({
        header: 'Cancel without saving?',
        html: '<p>This will close the editor without saving any changes.</p><p>Continue?</p>',
      });

      if( !isConfirmed ) {
        return;
      }

      vm.pallet = null;
      vm.manifest = null;
    }

    function splitGroupLabel2PalletHandle( label ) {
      return `${vm.pallet.handle}--${ label }`;
    }

    async function printLabels( splitGroup ) {

      if( !splitGroup.shippingItems || splitGroup.shippingItems.length === 0 ) {
        return ModalSvc.message( {
          header: 'Nothing to print',
          html: `<p>The split group <strong>${ splitGroup.label }</strong> has no shipping items configured.</p>`,
          type: 'warning'
        } );
      }

      if( !splitGroupsUnchanged() ) {
        const _pallet = await __saveProgress();
      }

      PrintSvc.printPalletSplitGroupLabels( vm.pallet._id, splitGroup._id );

    }

  }
]);


/******************* Finish Pallet Splitting Modal service ******************************/
angular.module('myApp').factory( 'FinishSplitPalletModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( pallet, splitGroups ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_finish_split_pallet_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          data: function () {
            return {
              pallet,
              splitGroups
            };
          }
        },

        controller: [ 'data', 'palletProperties', function( data, palletProperties ){

          const vm = this;
          vm.splitGroups = data.splitGroups;

          vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) );
          vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) );

          vm.validate = grp => {

            grp.errors = {};

            if( data.splitGroups.find( _ => _.handle === grp.handle && _ !== grp ) ) {
              grp.errors.duplicateHandle = true;
            }

            if( isHandleShipmentPalletDuplicate( grp.handle, data.pallet.shipment ) ) {
              grp.errors.duplicateHandle = true;
            }

          };


        }],
        controllerAs: '$ctrl'

      });

      return modalInstance.result;
    }

  };
}]);

