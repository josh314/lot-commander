import angular from 'angular';
import dayjs from 'dayjs';

import * as api from '../../api';
import * as util from '../../utilities';

/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( params ) => {

  const qp = {};

  if( "toBeFulfilled" in params ) {

    if( params.toBeFulfilled !== null ) {
      qp.to_be_fulfilled = params.toBeFulfilled ? 1 : 0;
    }

  }

  if( typeof params.startDate !== 'undefined' ) {

    qp.start_date = dayjs(params.startDate).format('YYYY-MM-DD');

  }

  if( typeof params.endDate !== 'undefined' ) {

    qp.end_date = dayjs(params.endDate).format('YYYY-MM-DD');

  }

  if( "annotate" in params ) {

    if( params.annotate !== null ) {
      qp.annotate = params.annotate ? 1 : 0;
    }

  }

  return qp;
};

const cmpByProductTitle = (a,b) => {
  if( !a.product ) {
    return -1;
  }
  else if ( !b.product ) {
    return 1;
  }
  else if( a.product.title > b.product.title ) {
    return 1;
  }
  else {
    return -1;
  }
};

const cmpByName = (a,b) => {
  if( a.name > b.name ) {
    return 1;
  }
  else {
    return -1;
  }
};

const cmpByKey = (a,b) => {
  if( a.key > b.key ) {
    return 1;
  }
  else {
    return -1;
  }
};

const cmpLineItemsByOrderCreatedAt = (a,b) => {
  if( a.order.createdAt > b.order.createdAt ) {
    return 1;
  }
  else if( a.name > b.name ) {
    return 1;
  }
  else {
    return -1;
  }
};

/******************* Order Service *************************/
//
// This service provides functionality to the orders API and UI
//
angular.module('myApp').service( 'OrderSvc', [

  '$q',
  'Order',
  'ProductBundlesSvc',
  'ShippingConfigurationsSvc',

  function(

    $q,
    Order,
    ProductBundlesSvc,
    ShippingConfigurationsSvc,

  ) {

    return {
      getOrder,
      list: listOrders,
      count: countOrders,
      unfulfilledOrderQueue,
      startOrderPick
    };

    function getOrder( orderId, { populate = [], hydrateLineItems = false } = {}  ) {
      return $q.when( api.getOrder( orderId, { populate } ) ).then( order => new Order( order, { hydrateLineItems } ));
    }

    function listOrders( { filter, sort, num, page, hydrateLineItems = false } ) {

      const query = {
        num,
        page
      };

      Object.assign( query, queryParams(filter) );

      if( sort.key ) {
        query.sort = sort.key;
        query.sort_dir = sort.ascending ? 1 : -1;
      }

      return $q.when( api.listOrders( query ) ).then( async orders => {
        if( !orders ) {
          return [];
        }

        await Promise.all([
          ProductBundlesSvc.refresh(),
          ShippingConfigurationsSvc.refresh( { everydayBargainsOnly: true, includePallets: true } )
        ]);

        return orders.map( data => new Order( data, { hydrateLineItems } ) );

      });
    }

    function countOrders( filter ) {
      return $q.when( api.countOrders( queryParams( filter ) ) );
    }

    function unfulfilledOrderQueue( startDate, endDate ) { // This redirection forces digest update of the async function _unfulfilledOrderQueue
      return $q.when( _unfulfilledOrderQueue( startDate, endDate ) );
    }

    async function _unfulfilledOrderQueue( startDate, endDate ) {

      const filter = {
        toBeFulfilled: true,
        startDate,
        endDate
      };

      const count = await countOrders( filter );

      if( !count ) {
        return {
          orders: [],
          lineItems: []
        };
      }

      const pageSize = 50;
      let allOrders = [];
      for( let i=0; i < count/50; i++ ) {

        const orders = await listOrders( {
          filter: Object.assign( filter, { annotate: true } ),
          // filter,
          num: pageSize,
          page: i+1,
          sort: {
            key: 'createdAt',
            ascending: true
          },
          hydrateLineItems: true,
        } );

        allOrders = allOrders.concat( orders );
      }

      // Flatten lineItems arrays
      const allLineItems = allOrders.reduce( ( acc, _order ) => angular.isArray( _order.lineItems ) ? acc.concat( _order.lineItems ) : acc , [] );
      const unfulfilledLineItems = allLineItems.filter( _li => _li.unfulfilledQuantity );

      await Promise.all( unfulfilledLineItems.map( _li => Promise.all( [ _li.lotLoaded, _li.bundleLoaded ] ) ) );
      const lotLineItems = unfulfilledLineItems.filter( _li => _li.lot && !_li.isEverydayBargain() );
      const unfulfilledLotLineItems = lotLineItems.filter( _li => !! _li.unfulfilledQuantity );

      // get the everyday bargains line items
      const everydayBargainsLineItems = unfulfilledLineItems.filter( _li => _li.isEverydayBargain() );

      // un-bundle line items like the all-star package
      const everydayBargainsUnbundledLineItems = everydayBargainsLineItems.reduce( ( unbundledItems, lineItem ) => {

        if( lineItem.isBundle() ) {
          unbundledItems = unbundledItems.concat( lineItem.bundle );
        }
        else {
          unbundledItems.push( lineItem );
        }

        return unbundledItems;
      } , [] );

      const everydayBargainsUnbundledLineItemsFlattenedShippingItems = everydayBargainsUnbundledLineItems.flatMap( _lineItem => {

        if( !_lineItem || ! _lineItem.shippingConfiguration ) {
          return null;
        }

        return _lineItem.shippingConfiguration.map( _shippingItem => {

          const productTitle = _lineItem.product.title;
          const boxSize = `${ _shippingItem.height }x${ _shippingItem.length }x${ _shippingItem.width }`;
          const unitsPerBox = _shippingItem.units;
          const key = `${productTitle}:${boxSize}${unitsPerBox ? `:${unitsPerBox}` : '' }`;

          return Object.assign( {}, _shippingItem, { productTitle, boxSize, unitsPerBox, key, count: _lineItem.unfulfilledQuantity } );
        });

      } ).filter( _ => _ );

      const everydayBargainsShippingItemsAggregated = everydayBargainsUnbundledLineItemsFlattenedShippingItems.reduce( ( _acc, _item ) => {

        const _existingAccItem = _acc.find( __item => __item.key === _item.key );
        if( _existingAccItem ) {
          _existingAccItem.count += _item.count;
        }
        else {

          const _newAccItem = Object.assign( {}, _item );
          _acc.push( _newAccItem );

        }

        return _acc;
      }, []);


      const otherLineItems = unfulfilledLineItems.filter( li => everydayBargainsLineItems.every( ebli => ebli.id !== li.id ) ).filter( li => lotLineItems.every( lli => lli.id !== li.id ) );
      const otherLineItemsAggregated = [];
      for( let li of otherLineItems ) {

        if( !li.unfulfilledQuantity ) { // ignore fulfilled line items for aggregation purposes
          continue;
        }

        const existingAggregationItem = otherLineItemsAggregated.find( _eb => _eb.name === li.name );

        if( existingAggregationItem ) {
          existingAggregationItem.count += li.unfulfilledQuantity;

          const variantTitle = li.variant ? li.variant.title : 'untitled';
          const existingVariant = existingAggregationItem.variants.find( _v => _v.title === variantTitle );
          if( existingVariant ) {
            existingVariant.count += li.unfulfilledQuantity;
          }
          else {
            const newVariant = { title: variantTitle, count: li.unfulfilledQuantity };
            existingAggregationItem.variants.push( newVariant );
          }


        }
        else {
          const newAggregationItem = {
            product: li.product,
            name: li.name,
            count: li.unfulfilledQuantity,
            variants: [ {
              title: li.variant ? li.variant.title : 'untitled',
              count: li.unfulfilledQuantity
            } ],
          };
          otherLineItemsAggregated.push( newAggregationItem );
        }

      }

      // TODO: are there any lineItems that aren't a lot but aren't everyday-bargains? enduring listings pallets like Drugstore High Piece Count Pallet

      // Sorts
      unfulfilledLineItems.sort( cmpLineItemsByOrderCreatedAt );
      everydayBargainsLineItems.sort( cmpByProductTitle );
      everydayBargainsUnbundledLineItems.sort( cmpByProductTitle );
      everydayBargainsShippingItemsAggregated.sort( cmpByKey );
      otherLineItems.sort( cmpByName );
      otherLineItemsAggregated.sort( cmpByName );


      return {
        // all orders and line items
        orders: allOrders,
        allLineItems,
        lineItems: unfulfilledLineItems,

        // one-off lots
        lotLineItems,
        unfulfilledLotLineItems,

        // everyday bargains by raw line item, unbundled line items, and aggregated
        everydayBargainsLineItems,
        everydayBargainsUnbundledLineItems,
        everydayBargainsShippingItemsAggregated,

        // Other line items and aggregation
        otherLineItems,
        otherLineItemsAggregated
      };

    }

    function startOrderPick( orderId ) {
      return $q.when( api.startOrderPick( orderId ) ).then( order => new Order( order, { hydrateLineItems: true } ) );
    }

  }
]);

/*********************** Order class */
angular.module('myApp').factory( 'Order', [

  'LineItem',
  'OrderPick',

  function(

    LineItem,
    OrderPick,

  ) {

    class Order {

      constructor( _data, { hydrateLineItems = false } ) {

        Object.assign( this,
          {  },
          _data,
          {
            lineItems: _data.lineItems.map( _lineItemData => {
              if( hydrateLineItems ) {
                _lineItemData.order = this;
                return new LineItem( _lineItemData );
              }
              else {
                return _lineItemData;
              }
            } ),
            createdAt: new Date( _data.createdAt ),
            orderPick: new OrderPick( _data )
          }
        );

      }

    }

    return Order;

  }
]);


/*********************** LineItem class */
angular.module('myApp').factory( 'LineItem', [

  'ListingsSvc',
  'LotSvc',
  'ProductBundlesSvc',
  'ShippingConfigurationsSvc',

  function(

    ListingsSvc,
    LotSvc,
    ProductBundlesSvc,
    ShippingConfigurationsSvc,


  ) {

    class LineItem {

      constructor( _data ) {

        Object.assign( this,
          {
            parentLineItem: null,
          },
          _data
        );

        // These fields define a promises which resolves once this.lot and this.bundle are populated (or determined to be null).
        // Awaiting such a data-field prevents `dereferencing undefined` errors.  Use it like so:
        //
        // await lineItem.lotLoaded;
        // const lot = lineItem.lot.blahblah;
        //
        this.lotLoaded = this.loadLot();
        this.bundleLoaded = this.loadBundle();
        this.shippingConfigurationLoaded = this.loadShippingConfiguration();

      }

      isPallet() {
        if( this.product && this.product.tags ) {
          return this.product.tags.some( t => /pallet/.test(t) );
        }
        return false;
      }

      isEverydayBargain() {
        return this.hasTag( 'everyday bargains' );
      }

      async loadLot() {

        if( this.isEverydayBargain() ) {
          return null;
        }

        const handle = this.sku;
        const lot =  handle ? await LotSvc.getLotByHandle( handle, { populate: [ 'pallet' ], hydratePalletNoDocuments: true } ) : null;

        this.lot = lot;

        return lot;
      }

      async loadBundle() {

        const _bundle = this.variant ? await ProductBundlesSvc.get( this.variant.id ) : null;

        if( _bundle && Array.isArray(_bundle.bundle) ) {

          const bundleItemPs = _bundle.bundle.map( async _ => {

            const pv = await ListingsSvc.getProductVariant( _.gid );

            if( !pv ) {
              return;
            }

            const units = parseInt( pv.title );

            const componentData = {
              order: this.order,
              parentLineItem: this,
              name: `${pv.productTitle} - ${pv.title}`,
              product: {
                title: pv.productTitle
              },
              quantity: this.unfulfilledQuantity,
              unfulfilledQuantity: this.unfulfilledQuantity,
              units: util.isNan( units ) ? pv.title : units,
              variant: {
                id: pv.gid,
                title: pv.title
              }
            };

            return new LineItem( componentData );
          } );

          this.bundle = (await Promise.all( bundleItemPs )).filter( _ => _ );
        }
        else {
          this.bundle = null;
        }

        return this.bundle;
      }

      async loadShippingConfiguration() {

        if( this.variant ) {

          const gid = this.variant.id;
          const resp = await ShippingConfigurationsSvc.get( gid );

          this.shippingConfiguration = resp && resp.shippingConfiguration;
          return this.shippingConfiguration;

        }
        else {
          return null;
        }

      }

      hasTag( tag ) {
        if( this.product && this.product.tags ) {
          return this.product.tags.some( t => t === tag );
        }
        return false;
      }

      isBundle() {
        return !!this.bundle;
      }

    }

    return LineItem;

  }
]);

/*********************** OrderPick class */
angular.module('myApp').factory( 'OrderPick', [

  '$q',
  'ManualPickItemModalSvc',
  'PackageSvc',

  function( $q, ManualPickItemModalSvc, PackageSvc ) {

    class PickItem {
      constructor( _data, orderPick ) {

        Object.assign(
          this,
          _data,
          {
            orderPick
          }
        );

      }

      pick( { pkg, shippingItem } = {} ) {
        return this.orderPick.pickItem( this._id, { pkg, shippingItem } );
      }

      manualPick() {
        return ManualPickItemModalSvc.launch().then( pkg => this.pick( { pkg } ) );
      }

      undoPick() {
        return this.orderPick.unpickItem( this._id );
      }

    }

    class OrderPick {
      constructor( order ) {

        Object.assign(
          this,
          {
            order
          }
        );

        if( !order.orderPick ) {
          return;
        }

        if( typeof order.orderPick === 'string' ) {
          this._id = order.orderPick;
          return;
        }

        Object.assign(
          this,
          order.orderPick,
        );

        this.buildPickLists();

      }

      buildPickLists( ) {

        const pickItems = Array.isArray( this.pickItems ) ? this.pickItems : [];

        const pickListMap = pickItems.reduce( ( map, pickItem ) => {

          const {

            lineItemId,
            lineItemCount,

          } = pickItem;

          const key = `${ lineItemId }:${ lineItemCount }`;

          let value = map.get( key );
          if( !value ) {

            value = [];

            map.set( key, value );

          }

          value.push( new PickItem( pickItem, this ) );

          return map;
        }, new Map());

        this.pickLists = [ ...pickListMap.values( ) ];

      }

      pickByLabel( label ) {

        const pickItem = this.getPickItemForShippingItem( label );

        if( pickItem ) {

          if( pickItem.isPicked ) {
            return Promise.resolve( { pickItem, error: `The shipping item '${label}' has already been picked.` } );
          }
          else {
            return pickItem.pick().then( updatedPickItem => ({ pickItem: updatedPickItem }) );
          }

        }

        return PackageSvc.get( label ).then( pkg => {

          if( pkg ) {

            if( pkg.isFulfilled ) {
              return {
                error: `The package '${label}' has already been fulfilled.`
              };
            }

            const _pickItem = this.getPickItemForPackage( pkg );

            if( _pickItem ) {
              return _pickItem.pick( { pkg: label } ).then( updatedPickItem => ({ pickItem: updatedPickItem }) );
            }
            else {
              return {
                error: `No valid pick item in this order for package '${label}'.`
              };
            }
          }

          return {
            error: `The label '${label}' was not found.`,
          };

        });

      }


      getPickItemForPackage( pkg ) {

        for( let pickList of this.pickLists ) {

          const foundPickItem = pickList.find( _item => {

            const itemCompareProductId = _item.bundleProductId || _item.productId;

            return !_item.isPicked && ( itemCompareProductId === pkg.productId ) && ( _item.units === pkg.units );

          });

          if( foundPickItem ) {
            return foundPickItem;
          }

        }

      }

      getPickItemForShippingItem( shippingItem ) {

        for( let pickList of this.pickLists ) {

          const foundPickItem = pickList.find( _item => _item.shippingItem === shippingItem );

          if( foundPickItem ) {
            return foundPickItem;
          }

        }

      }

      pickItem( pickItemId, { pkg, shippingItem } = {} ) {
        return $q.when( api.pickItem( this._id, pickItemId, { pkg, shippingItem } ) ).then(  this._updatePickItemFromResponse.bind( this ) );
      }

      _updatePickItemFromResponse( resp ) {

        const { orderPick: _orderPick, pickItem } = resp;

        let newPickItem;
        for( let pickList of this.pickLists ) {

          const foundPickListIndex = pickList.findIndex( _item => _item._id === pickItem._id );

          if( foundPickListIndex > -1 ) {

            const foundPickItemsIndex = this.pickItems.findIndex( _item => _item._id === pickItem._id );

            if( foundPickItemsIndex > -1 ) {
              this.pickItems.splice( foundPickItemsIndex, 1, pickItem );
            }

            newPickItem = new PickItem( pickItem, this );
            pickList.splice( foundPickListIndex, 1, newPickItem );
            break;
          }

        }

        return newPickItem;

      }

      unpickItem( pickItemId ) {
        return $q.when( api.unpickItem( this._id, pickItemId ) ).then(  this._updatePickItemFromResponse.bind( this ) );
      }

      reset() {

        return $q.when( api.resetOrderPick( this._id ) ).then( orderPick => {
          this.pickItems = orderPick.pickItems;
          this.buildPickLists();
        });

      }

    }

    return OrderPick;

  }
]);

/********************* Manual Pick modal **************************/
angular.module('myApp').factory( 'ManualPickItemModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  // launches the modal
  function launch() {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_manual_pick_item_modal.html',
      size: 'lg',
      backdrop: 'static',
      controller:  [ '$scope', 'focus', function( $scope, focus ){

        focus('ScanLabelInput');

        const vm = this;
        vm.label = '';

        vm.scanLabel = () => {

          if( vm.label ) {

            $scope.$close( vm.label );

          }

        };

      }],
      controllerAs: '$ctrl'
    });

    return modalInstance.result;
  }
}]);