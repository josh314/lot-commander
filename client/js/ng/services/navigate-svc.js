import angular from 'angular';

/****************** Navigate Service *****************************
* 
* Used for navigating around the app. Mostly just wraps the $state service
*
************/
angular.module('myApp').factory( 'navigate', [ '$state', function( $state ){

  const home = () => $state.go( 'main.home' );

  const viewLot = lotId => $state.go( 'main.lots.view', { lotId: lotId } );

  const scanLot = lotId => $state.go( 'main.lots.scan', { lotId: lotId } );

  const editLotManifest = () => $state.go( 'main.lots.edit-manifest' );

  const listLots = () => $state.go( 'main.lots.list' );

  const lotGallery = lotId => $state.go( 'main.lots.gallery', { lotId: lotId } );

  const reload = () => $state.reload();

  const shipmentCreation = () => $state.go( 'main.receiving.shipment-creation');

  const shipmentDetails = shipmentId => $state.go( 'main.receiving.shipment-details', { shipmentId: shipmentId } );

  const shipmentList = () => $state.go( 'main.receiving.shipment-list' );

  const shipmentReceiving = shipmentId  => $state.go( 'main.receiving.shipment-receiving', { shipmentId: shipmentId } );

  const shipmentCleanManifest = shipmentId  => $state.go( 'main.receiving.shipment-clean-manifest', { shipmentId: shipmentId } );

  const receivedPalletCreation = () => $state.go( 'main.receiving.received-pallet-creation');

  const receivedPalletList = () => $state.go( 'main.receiving.received-pallet-list' );

  const cleanManifest = () => $state.go( 'main.manifests.clean' );

  const history = ( species, id ) => $state.go( 'main.history', { species: species, id: id } );

  const submitListing = () => $state.go( 'main.lots.submit-listing' );

  const imageEditor = () => $state.go( 'main.lots.image-editor' );

  const uploadLotManifest = lotId => $state.go('main.lots.upload-manifest', { lotId: lotId });

  return {
    cleanManifest: cleanManifest,
    editLotManifest: editLotManifest,
    history: history,
    home: home,
    imageEditor: imageEditor,
    listLots: listLots,
    lotGallery: lotGallery,
    receivedPalletCreation: receivedPalletCreation,
    receivedPalletList: receivedPalletList,
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