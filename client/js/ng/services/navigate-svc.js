import angular from 'angular';

/****************** Navigate Service *****************************
*
* Used for navigating around the app. Mostly just wraps the $state service
*
************/
angular.module('myApp').factory( 'navigate', [ '$anchorScroll', '$state', function( $anchorScroll, $state ){

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

  const editLotManifest = () => $state.go( 'main.lots.edit-manifest' );

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

  const submitListing = () => {
    $anchorScroll();
    $state.go( 'main.lots.submit-listing' );
  };

  const imageEditor = () => {
    $anchorScroll();
    $state.go( 'main.lots.image-editor' );
  };

  const uploadLotManifest = lotId => {
    $anchorScroll();
    $state.go('main.lots.upload-manifest', { lotId: lotId });
  };

  const editPalletManifest = () => {
    $anchorScroll();
    $state.go('main.inventory-pallets.edit-manifest');
  };

  return {
    cleanManifest: cleanManifest,
    editLotManifest: editLotManifest,
    editPalletManifest: editPalletManifest,
    history: history,
    home: home,
    imageEditor: imageEditor,
    listLots: listLots,
    lotGallery: lotGallery,
    inventoryPalletCreation: inventoryPalletCreation,
    inventoryPalletView: inventoryPalletView,
    reload: reload,
    shipmentCleanManifest: shipmentCleanManifest,
    shipmentCreation: shipmentCreation,
    shipmentDetails: shipmentDetails,
    shipmentList: shipmentList,
    shipmentReceiving: shipmentReceiving,
    submitListing: submitListing,
    scanLot: scanLot,
    uploadLotManifest: uploadLotManifest,
    viewLot: viewLot,
  };
}]);