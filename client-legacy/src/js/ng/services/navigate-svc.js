import angular from 'angular';

/****************** Navigate Service *****************************
*
* Used for navigating around the app. Mostly just wraps the $state service
*
************/
angular.module('myApp').factory( 'navigate', [ '$anchorScroll', '$state', function( $anchorScroll, $state ){

  const scrollToTop = () => {
    $anchorScroll();
  };

  const home = () => {
    $anchorScroll();
    $state.go( 'main.home' );
  };

  const viewLot = lotId => {
    $anchorScroll();
    $state.go( 'main.lots.view', { lotId: lotId } );
  };

  const scanLot = lotId => {
    $anchorScroll();
    $state.go( 'main.lots.scan', { lotId: lotId } );
  };

  const reviewLotManifest = lotId => {
    $anchorScroll();
    $state.go( 'main.lots.review-manifest', { lotId: lotId } );
  };

  const listLots = () => {
    $anchorScroll();
    $state.go( 'main.lots.list' );
  };

  const lotGallery = lotId => {
    $anchorScroll();
    $state.go( 'main.lots.gallery', { lotId: lotId } );
  };

  const reload = scrollToTop => {
    if( scrollToTop ) {
      $anchorScroll();
    }
    $state.reload();
  };

  const shipmentCreation = () => {
    $anchorScroll();
    $state.go( 'main.shipments.creation');
  };

  const shipmentDetails = shipmentId => {
    $anchorScroll();
    $state.go( 'main.shipments.details', { shipmentId: shipmentId } );
  };

  const shipmentList = () => {
    $anchorScroll();
    $state.go( 'main.shipments.list' );
  };

  const shipmentProcessManifest = shipmentId => {
    $anchorScroll();
    $state.go( 'main.shipments.process-manifest', { shipmentId: shipmentId } );
  };

  const shipmentReceiving = shipmentId  => {
    $anchorScroll();
    $state.go( 'main.shipments.receiving', { shipmentId: shipmentId } );
  };

  const shipmentCleanManifest = shipmentId  => {
    $anchorScroll();
    $state.go( 'main.shipments.clean-manifest', { shipmentId: shipmentId } );
  };

  const inventoryPalletCreation = () => {
    $anchorScroll();
    $state.go( 'main.inventory-pallets.creation');
  };

  const inventoryPalletView = () => {
    $anchorScroll();
    $state.go( 'main.inventory-pallets.view' );
  };

  const cleanManifest = () => {
    $anchorScroll();
    $state.go( 'main.manifests.clean' );
  };

  const history = ( species, id ) => {
    $anchorScroll();
    $state.go( 'main.history', { species: species, id: id } );
  };

  const submitListing = lotId => {
    $anchorScroll();
    $state.go( 'main.lots.submit-listing', { lotId } );
  };

  const imageEditor = () => {
    $anchorScroll();
    $state.go( 'main.lots.image-editor' );
  };

  const uploadLotManifest = lotId => {
    $anchorScroll();
    $state.go('main.lots.upload-manifest', { lotId: lotId });
  };

  const repackPallet = ( palletId ) => {
    $anchorScroll();
    $state.go('main.inventory-pallets.repack', { palletId } );
  };

  const splitPallet = ( palletId ) => {
    $anchorScroll();
    $state.go('main.inventory-pallets.split', { palletId } );
  };

  const pickOrder = orderId => {
    $anchorScroll();
    $state.go('main.orders.pick', { orderId } );
  };

  const orderQueue = () => {
    $anchorScroll();
    $state.go('main.orders.queue' );
  };

  return {
    cleanManifest,
    history,
    home,
    imageEditor,
    listLots,
    lotGallery,
    inventoryPalletCreation,
    inventoryPalletView,
    orderQueue,
    pickOrder,
    reload,
    repackPallet,
    reviewLotManifest,
    scanLot,
    scrollToTop,
    splitPallet,
    shipmentCleanManifest,
    shipmentCreation,
    shipmentDetails,
    shipmentList,
    shipmentProcessManifest,
    shipmentReceiving,
    submitListing,
    uploadLotManifest,
    viewLot,
  };
}]);