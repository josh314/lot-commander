import angular from 'angular';

/******************* Provides utility function for selecting focus on elements by id ***/
angular.module('myApp').factory('packagingTypeInfoModal', ['messageModal', function(messageModal) {
  return function() {
    const packagingInfoHtml = `
      <dl>
        <dt>box lot</dt>
        <dd>Standard small lot packed into one or more boxes</dd>
        <dt>pallets</dt>
        <dd>Pallet lot that is eligible for Pallet Breakdown Service</dd>
        <dt>pallets:bulky</dt>
        <dd>Pallet lot that is not eligible for Pallet Breakdown Service, but is within the normal size range for a pallet</dd>
        <dt>pallets:oversized</dt>
        <dd>Pallet-sized lot containing oversized items which exceed the normal dimensions of a pallet. Not eligible for Pallet Breakdown Service</dd>
        <dt>truckloads</dt>
        <dd>Truckloads or LTL lots</dd>
      </dl>
    `;
    messageModal.launch({header: 'Packaging Types', html: packagingInfoHtml, type: 'info'});
  };
}]);
