import angular from 'angular';
import {
  isUpce,
  upce2upca,
} from '../../upc';
import * as util from '../../utilities';
import _ from 'angular-animate';

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

function splitGroupLabel2PalletHandle( label, pallet ) {
  return `${pallet.handle}--${ label }`;
}


function createPalletLotHandle( palletHandle, lotNumber ) {
  return `${ palletHandle }--${ lotNumber }`;
}

const __DEFAULT_SPLIT_GROUP_LABEL_TYPES__ = [
  { value: 'SAL', name: 'SAL - Salvage', condition: 'salvage' },
  { value: 'PC', name: 'PC - Personal Care', category: 'personal care' },
  { value: 'GM', name: 'GM - General Merchandise', category: 'general merchandise' },
  { value: 'AP', name: 'AP - Apparel/Clothing', category: 'clothing' },
  { value: 'LIQ', name: 'LIQ - Liquid' },
  { value: 'COS', name: 'COS - Cosmetics', category: 'cosmetics' },
  { value: 'NP', name: 'NP - Nail Polish', category: 'cosmetics' },
  { value: null, name: 'Custom' },
];

/******************* Pallet Split Controller *************************/
angular.module('myApp').controller( 'InventoryPalletSplitCtrl', [

  'AudioAlertSvc',
  'dbEnums',
  'FinishSplitPalletModal',
  'focus',
  'ImageSvc',
  'InventoryPalletManagerSvc',
  'LoggedInUser',
  'ManifestFileHandlerSvc',
  'ModalSvc',
  'navigate',
  'PalletLotSvc',
  'PalletManifestSvc',
  'palletProperties',
  'PrintSvc',
  'sessionTimeout',
  'ShipmentFactory',
  'ShippingItemsSvc',
  'SplitGroupNameModal',
  'StandardManifestColumnsConst',

  function(

    AudioAlertSvc,
    dbEnums,
    FinishSplitPalletModal,
    focus,
    ImageSvc,
    InventoryPalletManagerSvc,
    LoggedInUser,
    ManifestFileHandlerSvc,
    ModalSvc,
    navigate,
    PalletLotSvc,
    PalletManifestSvc,
    palletProperties,
    PrintSvc,
    sessionTimeout,
    ShipmentFactory,
    ShippingItemsSvc,
    SplitGroupNameModal,
    StandardManifestColumnsConst,

  ) {


    /*********************************************
     * DisplaySplitGroup class
     * =======================
     *
     *******/

    class DisplaySplitGroup {


      /*********************************************
       * Constructor
       * ================
       *
       *******/

      constructor( {
        _id,
        label,
        labelType,
        description,
        lotNumber,
        items = [],
        condition,
        category,
        toBeProcessed = false,
        toBeListed,
        isAllocatedForUnmanifestedLots = false,
        packagingType = 'box lot',
        shippingItems = [],
        images,
        isMissing,
      } ) {

        Object.assign(
          this,
          {
            _id,
            images,

            showDetails: false,
            itemEdits: new Map(),
          }
        );

        this.setData( {
          label,
          labelType,
          description,
          items,
          condition,
          category,
          toBeProcessed,
          toBeListed,
          isAllocatedForUnmanifestedLots,
          packagingType,
          shippingItems,
          lotNumber,
          images,
          isMissing,
        } );

        if( typeof condition === 'undefined' ) {
          this.condition = vm.pallet.condition;
        }

        if( typeof category === 'undefined' ) {
          this.category = vm.pallet.category;
        }

        if( typeof toBeListed === 'undefined' ) {
          this.toBeListed = vm.pallet.toBeListed || false;
        }

        if( typeof isMissing === 'undefined' ) {
          this.isMissing = vm.pallet.isMissing;
        }

        this.setLabel( label );
      }

      toggleShowDetails() {
        this.showDetails = !this.showDetails;
      }

      /*********************************************
       * Getting metadata
       * ================
       *
       *******/


      // get the data
      getData() {
        return {
          _id: this._id,
          description: this.description,
          lotNumber: this.lotNumber,
          palletHandle: this.palletHandle,
          lotHandle: this.lotHandle,
          label: this.label,
          labelType: this.labelType,
          condition: this.condition,
          category: this.category,
          toBeProcessed: this.toBeProcessed,
          toBeListed: this.toBeListed,
          isAllocatedForUnmanifestedLots: this.isAllocatedForUnmanifestedLots,
          items: this.items,
          packagingType: this.packagingType,
          shippingItems: this.shippingItems,
          images: this.images && this.images.map( ImageSvc.cleanImageObject.bind(ImageSvc) ),
          isMissing: this.isMissing,
        };
      }


      totalUnits() {
        return this.items.reduce( ( total, item ) => total + item.numSplit, 0 );
      }

      totalRetailValue() {
        return this.items.reduce( ( total, item ) => total + item.unitRetailPrice*item.numSplit, 0 );
      }

      totalSalesValue() {
        return this.totalRetailValue() * vm.pallet.priceValuePercentage / 100;
      }

      getCategoryFromLabelType() {

        const splitGroupDefaultLabelType = __DEFAULT_SPLIT_GROUP_LABEL_TYPES__.find( _ => _.value === this.labelType );
        if( splitGroupDefaultLabelType ) {
          return splitGroupDefaultLabelType.category;
        }

      }

      getConditionFromLabelType() {

        const splitGroupDefaultLabelType = __DEFAULT_SPLIT_GROUP_LABEL_TYPES__.find( _ => _.value === this.labelType );
        if( splitGroupDefaultLabelType ) {
          return splitGroupDefaultLabelType.condition;
        }

      }



      /*********************************************
       * Editing metadata
       * ================
       *
       *******/


      setData( {
        label,
        labelType,
        description,
        lotNumber,
        lotHandle,
        palletHandle,
        items = [],
        condition,
        category,
        toBeProcessed,
        toBeListed,
        isAllocatedForUnmanifestedLots,
        packagingType = 'box lot',
        shippingItems = [],
        isMissing
      } ) {

        this.setLabel( label );

        Object.assign(
          this,
          {
            labelType,
            description,
            items,
            condition,
            category,
            toBeProcessed,
            toBeListed,
            isAllocatedForUnmanifestedLots,
            packagingType,
            shippingItems,
            lotNumber,

            // overwrite value(s) from `setLabel` if explicitly passed in
            palletHandle,
            lotHandle,
            isMissing,
          }
        );

      }

      setDataValue( key, value ) {
        this[ key ] = value;
      }

      setLabel( label ) {

        this.label = label;
        this.palletHandle = splitGroupLabel2PalletHandle( this.label, vm.pallet );
        // TODO: set lotHandle
        if( this.lotNumber ) {
          this.lotHandle = createPalletLotHandle( this.palletHandle, this.lotNumber );
        }

      }

      onToBeProcessedChange() {
        if( this.toBeProcessed ) {
          this.toBeListed = false;
          this.isAllocatedForUnmanifestedLots = false;
        }
      }

      onToBeListedChange() {
        if( this.toBeListed ) {
          this.toBeProcessed = false;
          this.isAllocatedForUnmanifestedLots = false;
        }
      }

      onIsAllocatedForUnmanifestedLotsChange() {
        if( this.isAllocatedForUnmanifestedLots ) {
          this.toBeListed = false;
          this.toBeProcessed = false;
        }
      }

      onIsMissingChange() {
        if( this.isMissing ) {
          this.toBeListed = false;
          this.toBeProcessed = false;
          this.isAllocatedForUnmanifestedLots = false;
        }
      }

      /*********************************************
       * Splitting
       * =========
       *
       * ***/

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
            representativeImgSrc: displayItem.representativeImgSrc,
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


      /*********************************************
       * ShippingItems and printing
       * ==========================
       *
       *****/

      editShippingItems() {

        const skipValidation = true;

        ModalSvc.shippingItems( this.shippingItems, skipValidation ).then( shippingItems => {
          if( shippingItems ) {
            this.shippingItems = shippingItems;
            ShippingItemsSvc.setPackagingTypeFromShippingItems( this );
          }
        });
      }

      setShippingItems( shippingItems ) {
        if( shippingItems ) {
          this.shippingItems = shippingItems;
          ShippingItemsSvc.setPackagingTypeFromShippingItems( this );
        }
      }

      async printLabels() {
        if( !this.shippingItems || this.shippingItems.length === 0 ) {
          return ModalSvc.message( {
            header: 'Nothing to print',
            html: `<p>The split group <strong>${ this.label }</strong> has no shipping items configured.</p>`,
            type: 'warning'
          } );
        }

        if( !splitGroupsUnchanged() ) {
          await __saveProgress();
        }

        PrintSvc.printPalletSplitGroupLabels( vm.pallet._id, this._id );

      }


      /*********************************************
       * Images
       * ======
       *
       *****/

      async uploadImages() {

        return ImageSvc.uploadPalletSplitGroupImages( vm.pallet._id, this._id, this.imagesToUpload );

      }

      async removeImage( image ) {

        return ImageSvc.removePalletSplitGroupImage( vm.pallet._id, this._id, image );

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
    const __BRAND__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_BRAND_COLUMN__;
    const __IMAGE__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_IMAGE_COLUMN__;

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
        toBeProcessed: true,
      };

      vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) ),
      vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) ),
      vm.packagingTypeOptions = [ "" ].concat( dbEnums.packagingType );
      vm.labelTypeOptions = __DEFAULT_SPLIT_GROUP_LABEL_TYPES__;

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
          // modules
          util,

          openPackagingTypeInfo: ModalSvc.packagingTypeInfo.bind( ModalSvc ),

          refreshPalletsList,
          splitPallet: pallet => navigate.splitPallet( pallet._id ),

          splitGroupsUnchanged,
          totalUnitsSplit,

          // manage split groups
          newSplitGroup,
          deleteSplitGroup,
          bumpCurrentSplitGroup,

          splitItem,
          editSplitGroupLabel,

          save,
          cancel,
          allItemsSplitOut,
          createSplitGroupFromRemainingItems,
          finish,

          getImageLink: ImageSvc.getImageLink.bind( ImageSvc ),
          uploadImages,
          removeImage,

        }
      );

      vm.palletId = InventoryPalletManagerSvc.getPalletId();
      if( vm.palletId ) {
        loadPalletById( vm.palletId );
      }

    }

    function loadInventoryThumbnailImages() {

      const loadImagePromises = [];

      for( let item of vm.manifestDisplayRows ) {

        const images = item[ __IMAGE__ ];

        if( !images || !images.length ) {
          continue;
        }

        loadImagePromises.push(
          ImageSvc.loadRepresentativeImage({ images }).then( img => {

            if( img ) {
              item.representativeImgSrc = img.src;
            }

          } )
        );

      }

      return Promise.all( loadImagePromises ).then( _ => {

        for( let grp of vm.displaySplitGroups ) {
          for( let item of grp.items ) {

            const displayItem = vm.manifestDisplayRows.find( _r => _r[ __BARCODE__ ]  === item[ __BARCODE__ ] );
            if( displayItem ) {
              item.representativeImgSrc = displayItem.representativeImgSrc;
            }

          }
        }

      });

    }



    function allItemsSplitOut() {

      if( !vm.manifestDisplayRows ) {
        return false;
      }

      for( let row of vm.manifestDisplayRows ) {

        if( row.numSplit !== row[ __QUANTITY__ ] ) {
          return false;
        }

      }

      return true;
    }

    async function createSplitGroupFromRemainingItems() {

      const leftoversSplitGroupItems = convertLeftovers2SplitGroupItems();

      const remainingItemsSplitGroup = new DisplaySplitGroup( {
        label: 'remaining',
        packagingType: 'box lot',
        items: leftoversSplitGroupItems,
        shippingItems: [],
        toBeListed: false
      });

      addSplitGroup( remainingItemsSplitGroup );

      await editSplitGroupLabel( remainingItemsSplitGroup );

      await ModalSvc.wait({
        waitFor: __saveProgress().then( reloadPallet )
      });

    }

    async function uploadImages( grp ) {

      await __saveProgress();

      await ModalSvc.wait( {
        waitFor: grp.uploadImages().then( reloadPallet ),
        delay: 2000
      } );

    }

    async function removeImage( grp, image ) {

      await __saveProgress();

      await ModalSvc.wait( {
        waitFor: grp.removeImage( image ).then( reloadPallet ),
        delay: 2000
      } );

    }

    async function loadPalletById( palletId ) {
      vm.pallet = await InventoryPalletManagerSvc.get( palletId, { populate: [ 'shipment', 'shipment.palletsReceived', 'shipment.palletsConsolidated' ] } );
      vm.pallet.shipment = ShipmentFactory( vm.pallet.shipment );
      await vm.pallet.documentsAreLoaded;
      loadPallet( vm.pallet );
    }

    function reloadPallet() {
      return loadPalletById( vm.pallet._id );
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

      addSplitGroup( newDisplaySplitGroup );

      editSplitGroupLabel( newDisplaySplitGroup );
    }

    function addSplitGroup( newSplitGroup ) {

      vm.displaySplitGroups.push( newSplitGroup );
      vm.displaySplitGroupsSorted = [ newSplitGroup ].concat( vm.displaySplitGroupsSorted );

      vm.currentSplitGroup = newSplitGroup;

    }

    function editSplitGroupLabel( currentGroup ) {

      return SplitGroupNameModal.launch( {
        currentGroup,
        splitGroups: vm.displaySplitGroups,
        pallet: vm.pallet
      } );

    }


    async function deleteSplitGroup( group ) {

      //  popup to ask if they're sure
      const isConfirmed = await ModalSvc.confirm({
        header: 'Delete split group?',
        html: `<p>Really delete this split group?</p>
              <p>You will lose all data for this split group. This cannot be undone.</p>
              <p>Continue?</p>`
      });

      if( !isConfirmed ) {
        return;
      }

      const foundIdx = vm.displaySplitGroups.findIndex( _ => _ === group );

      if( foundIdx >= 0 ) {
        vm.displaySplitGroups.splice( foundIdx, 1 );
      }

      await __saveProgress();

      navigate.reload();

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

    async function loadPallet( pallet ) {

      vm.pallet = pallet;
      if( vm.pallet.isBrokendown ) {
        return ModalSvc.message( { header: 'Error', body: `Pallet ${pallet.handle} is already broken down.`, type: 'error' }).then( _ => navigate.splitPallet() );
      }

      vm.manifestFilename = pallet.getManifestFilename();
      if( !vm.manifestFilename ) {
        return ModalSvc.message({ header: 'Error', body: `No manifest for pallet ${pallet.handle}.`, type: 'error' });
      }

      const refreshProductData = true;

      const manifest = await ModalSvc.wait( {
        waitFor: pallet.loadManifest( refreshProductData ),
      });

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
                  _splitItem[ __IMAGE__ ] = displayItem[ __IMAGE__ ];
                }
              });

            }

          }

        }
      }

      loadInventoryThumbnailImages();

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

        if( currentGrp.description !== oldGrp.description ) {
          return false;
        }

        if( currentGrp.category !== oldGrp.category ) {
          return false;
        }

        if( currentGrp.condition !== oldGrp.condition ) {
          return false;
        }

        if( currentGrp.toBeProcessed !== oldGrp.toBeProcessed ) {
          return false;
        }

        if( currentGrp.toBeListed !== oldGrp.toBeListed ) {
          return false;
        }

        if( currentGrp.isAllocatedForUnmanifestedLots !== oldGrp.isAllocatedForUnmanifestedLots ) {
          return false;
        }

        if( currentGrp.packagingType !== oldGrp.packagingType ) {
          return false;
        }

        if( currentGrp.isMissing !== oldGrp.isMissing ) {
          return false;
        }


        // .slice() performs shallow copy so that we don't re-order the original arrays
        const items1 = oldGrp.items.slice().sort( cmpSplitGroupItems );
        const items2 = currentGrp.items.slice().sort( cmpSplitGroupItems );

        if( JSON.stringify(items1) !== JSON.stringify(items2) ) {
          return false;
        }

        // .slice() performs shallow copy so that we don't re-order the original arrays
        const shippingItems1 = oldGrp.shippingItems.slice().sort( ShippingItemsSvc.compare.bind( ShippingItemsSvc ) );
        const shippingItems2 = currentGrp.shippingItems.slice().sort( ShippingItemsSvc.compare.bind( ShippingItemsSvc ) );

        if( JSON.stringify(shippingItems1) !== JSON.stringify(shippingItems2) ) {
          return false;
        }

      }

      return true;

    }

    function _trimEmptySplitGroups() {

      vm.displaySplitGroups = vm.displaySplitGroups.filter( _grp => _grp.items.length );
      vm.displaySplitGroupsSorted = vm.displaySplitGroupsSorted.filter( _grp => _grp.items.length );

    }


    async function __saveProgress() {

      // trimEmptySplitGroups();
      const editValues = {
        splitGroups: vm.displaySplitGroups.map( _ => _.getData() ),
      };

      const pallet = await ModalSvc.wait( {
        waitFor: vm.pallet.edit( editValues ),
        delay: 2000
      } );


      // This updates the _id and/or lotNumber of any split groups that were created since the last save, as well as _id of any new shippingItems
      for( let splitGroup of vm.displaySplitGroups ) {

        const match = pallet.splitGroups.find( _ => _.label === splitGroup.label );

        splitGroup._id = splitGroup._id || match._id;
        splitGroup.lotNumber = splitGroup.lotNumber || match.lotNumber;
        splitGroup.shippingItems = match.shippingItems;

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
      await reloadPallet();

      await ModalSvc.message( {
        header: 'Saved.',
        body: `Successfully saved split items.`
      } );

      navigate.scrollToTop();

    }

    async function createNewPalletFromSplitGroup( splitGroup ) {

      const {
        _id,
        label: _label,
        description,
        palletHandle,
        lotNumber,
        items,
        condition,
        category,
        toBeProcessed,
        toBeListed,
        isAllocatedForUnmanifestedLots,
        packagingType,
        shippingItems,
        isMissing
      } = splitGroup.getData();

      const rows = convertSplitGroupItems2ManifestRows( items );

      let palletPromise;

      const manifest = new ManifestFileHandlerSvc.Manifest();
      const sheet = new ManifestFileHandlerSvc.Sheet(  {
        manifest,
        name: 'Data',
        rows
      } );
      manifest.addSheet( sheet );

      const file = ManifestFileHandlerSvc.createFile( `${ palletHandle }.xlsx`, manifest, true );

      const palletTotals = manifest.standardTotals();

      const newPalletProperties = {
        handle: palletHandle,
        description,
        lotNumber,
        condition,
        category,
        toBeProcessed,
        toBeListed,
        isAllocatedForUnmanifestedLots,
        packagingType,
        shippingItems,
        isMissing,
        splitFrom: vm.pallet._id,
      };

      if( vm.pallet.cost && vm.pallet.units ) {
        newPalletProperties.cost = vm.pallet.cost * palletTotals.quantity / vm.pallet.units;
      }

      // overwrite these values if this is a pallet of missing items
      if( isMissing ) {
        newPalletProperties.toBeProcessed = false;
        newPalletProperties.toBeListed = false;
      }

      if( vm.pallet.priceValuePercentage ) {
        newPalletProperties.priceValuePercentage = vm.pallet.priceValuePercentage;
      }

      if( vm.pallet.shipment ) {

        palletPromise = vm.pallet.shipment.addConsolidatedPallet( newPalletProperties );

      }
      else {

        // TODO: test this, although there is currently no ability to have orphaned pallets with manifests. This will change with merged manifests.
        // Note the return value is a different signature from `vm.pallet.shipment.addConsolidatedPallet( newPalletProperties )` = { shipment, pallet }

        palletPromise = InventoryPalletManagerSvc.create( newPalletProperties );

      }

      const { shipment: _shipment , pallet, error, code: _code , message } = await palletPromise;

      if( error ) {
        throw new SplitPalletError( { message } );
      }

      // upload the new pallet manifest, update the pallet in client and return;
      const editValues = {
        units: palletTotals.quantity,
        retailValue: palletTotals.retailValue,
        salePrice: palletTotals.salePrice,
      };
      const updatedPallet = await PalletManifestSvc.uploadInventoryPalletManifest( pallet, file, editValues ).then( pallet => pallet.refreshDocuments() );

      if( splitGroup.images && splitGroup.images.length ) {

        const imageLocations = splitGroup.images.map( img => img.s3 ).filter( _ => _ );

        await updatedPallet.cloneImages( imageLocations );

      }

      if( isMissing ) {
        await updatedPallet.breakdown();
      }

      return updatedPallet;
    }


    async function createSplitGroupChildren( splitGroups ) {

      const promises = [];
      for( let group of splitGroups ) {

        if( group.items.length ) {
          promises.push( createPalletAndLotFromSplitGroup( group ) );
        }

      }

      return Promise.all( promises );

    }

    async function createPalletAndLotFromSplitGroup( splitGroup ) {

      const pallet = await createNewPalletFromSplitGroup( splitGroup );

      let lot;
      if( pallet.toBeListed && !pallet.isMissing ) {
        lot = await PalletLotSvc.createLot( pallet, { handle: splitGroup.lotHandle } );
        await pallet.breakdown();
      }

      return { splitGroup, pallet, lot };

    }

    function convertLeftovers2SplitGroupItems() {

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

      vm.displaySplitGroups = vm.displaySplitGroups.filter( _ => _.items.length );

      // save the final splitGroups
      await __saveProgress();

      const result = await FinishSplitPalletModal.launch( vm.pallet, vm.displaySplitGroups );

      // save again in case anything is modified by FinishSplitPalletModal
      await __saveProgress();

      if( result ) {

        // create children pallets/lots and then breakdown
        await ModalSvc.wait( {
          waitFor: createSplitGroupChildren( vm.displaySplitGroups ).then( () => vm.pallet.breakdown( true ) ),
        } );

        await ModalSvc.message( { header: 'Splitting complete', body: `Successfully created new split pallets and lots.` } );

        navigate.splitPallet();

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
  }
]);

/******************* Split Group Name Modal service ******************************/
angular.module('myApp').factory( 'SplitGroupNameModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( { currentGroup, splitGroups, pallet } ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_split_group_name_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          resolvedModalData: function () {
            return {
              currentGroup,
              splitGroups,
              pallet
            };
          }
        },
        controllerAs: '$ctrl',
        controller: [ '$scope', 'resolvedModalData', function( $scope, resolvedModalData ) {

          const vm = this;
          init();

          function init() {

            Object.assign(
              vm,
              {

                labelTypeOptions: __DEFAULT_SPLIT_GROUP_LABEL_TYPES__,

                edits: {
                  label: resolvedModalData.currentGroup.label,
                  labelType: resolvedModalData.currentGroup.labelType,
                  category: resolvedModalData.currentGroup.category,
                  condition: resolvedModalData.currentGroup.condition,
                },

                onLabelTypeChange,
                onLabelChange,
                validate,
                save
              }
            );


          }

          function labelTypeLabel( type, num ) {
            return `${ type }-${ num }`;
          }

          function onLabelTypeChange() {
            if( vm.edits.labelType !== null ) {

              let proposedLabel;
              let match;
              let i = 0;
              do {
                i++;
                proposedLabel = labelTypeLabel( vm.edits.labelType, i );
                match = resolvedModalData.splitGroups.find( _ => _ !== resolvedModalData.currentGroup && _.label === proposedLabel );

              } while( match );

              vm.edits.label = proposedLabel;

              const labelTypeOption = __DEFAULT_SPLIT_GROUP_LABEL_TYPES__.find( _ => _.value === vm.edits.labelType );
              if( labelTypeOption.category ) {
                vm.edits.category = labelTypeOption.category;
              }
              if( labelTypeOption.condition ) {
                vm.edits.condition = labelTypeOption.condition;
              }
            }
          }

          function onLabelChange() {
            validate();
          }

          function validate() {
            vm.errors = {};

            const existingGrpWithEditLabel = resolvedModalData.splitGroups.find( _ => _ !== resolvedModalData.currentGroup && _.label === vm.edits.label );

            if( existingGrpWithEditLabel ) {
              vm.errors.duplicateSplitGroupLabel = true;
            }

            // check against other shipment pallets

            const palletHandle = splitGroupLabel2PalletHandle( vm.edits.label, resolvedModalData.pallet );
            if( isHandleShipmentPalletDuplicate( palletHandle, resolvedModalData.pallet.shipment ) ) {
              vm.errors.duplicatePalletHandle = true;
            }

            for( let errorValue of Object.values( vm.errors ) ) {

              if( errorValue ) {
                return false;
              }

            }

            return true;
          }

          function save() {

            resolvedModalData.currentGroup.setLabel( vm.edits.label );
            resolvedModalData.currentGroup.labelType = vm.edits.labelType;
            resolvedModalData.currentGroup.setDataValue( 'category', vm.edits.category );
            resolvedModalData.currentGroup.setDataValue( 'condition', vm.edits.condition );

            $scope.$close();
          }

        }]

      });

      return modalInstance.result;
    }

  };
}]);

/******************* Finish Pallet Splitting Modal service ******************************/
angular.module('myApp').factory( 'FinishSplitPalletModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( pallet, splitGroups ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_finish_split_pallet_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          resolvedModalData: function () {
            return {
              pallet,
              splitGroups
            };
          }
        },
        controller: 'FinishSplitPalletModalCtrl as $ctrl',

      });

      return modalInstance.result;
    }

  };
}]);

/******************* Controller for Finish Pallet Splitting Modal service ******************************/
angular.module('myApp').controller( 'FinishSplitPalletModalCtrl', [

  '$scope',
  'LotSvc',
  'ModalSvc',
  'resolvedModalData',

  function(

    $scope,
    LotSvc,
    ModalSvc,
    resolvedModalData,

  ) {

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          splitGroups: resolvedModalData.splitGroups.map( _ => ( { original: _,
            edits: _.getData() } ) ),

          onPalletHandleChange,
          onLotHandleChange,
          validateGroup,
          validateAll,
          done,
        }
      );

    }

    function validateGroup( grp ) {
      grp.errors = {};

      if( vm.splitGroups.find( _ => _.edits.palletHandle === grp.edits.palletHandle && _ !== grp ) ) {
        grp.errors.duplicatePalletHandle = true;
      }
      if( isHandleShipmentPalletDuplicate( grp.edits.palletHandle, resolvedModalData.pallet.shipment ) ) {
        grp.errors.duplicatePalletHandle = true;
      }

      if( vm.splitGroups.find( _ => _.edits.lotHandle === grp.edits.lotHandle && _ !== grp ) ) {
        grp.errors.duplicateLotHandle = true;
      }

      for( let errorValue of Object.values( grp.errors ) ) {

        if( errorValue ) {
          return false;
        }

      }
      return true;
    }

    function validateAll() {
      for( let grp of vm.splitGroups ) {
        if( !validateGroup( grp ) ) {
          return false;
        }
      }
      return true;
    }

    function setSplitGroupLotHandle( grp ) {

      let lotHandle = '';

      if( grp.original.lotNumber ) {
        lotHandle += createPalletLotHandle( grp.edits.palletHandle, grp.original.lotNumber );
      }

      Object.assign( grp.edits, { lotHandle } );
    }


    function onPalletHandleChange( grp ) {
      if( validateGroup( grp ) ) {
        setSplitGroupLotHandle( grp );
      }
    }

    function onLotHandleChange( grp ) {
      validateGroup( grp );
    }

    async function done() {

      for( let grp of vm.splitGroups ) {

        if( grp.edits.toBeListed && grp.edits.lotHandle ) {

          const existingLot = await LotSvc.getLotByHandle( grp.edits.lotHandle );
          if( existingLot ) {
            return ModalSvc.message( { header: 'Error', html: `<p>There already exists a lot with handle <strong>${ grp.edits.lotHandle }</strong>.</p>`, type: 'error' } );
          }

        }

      }

      for( let grp of vm.splitGroups ) {
        grp.original.setData( grp.edits );
      }
      $scope.$close( true );
    }

  }
]);
