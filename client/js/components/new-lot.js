import app from '../ng-app';

/******************* New Lot Controller *************************/
app.controller('NewLotCtrl', ['$http', '$scope', '$state', 'dbEnums', 'listingBuilder', 'lotCategories', 'lotStore', 'messageModal', 'sessionTimeout', 
  function($http, $scope, $state, dbEnums, listingBuilder, lotCategories, lotStore, messageModal, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    $scope.quickLots = listingBuilder.quickLotsBoilerplate;

    $scope.lotTypes = dbEnums.lotType;

    $scope.categories = ['None'].concat(lotCategories.map(x=>x.name));
    $scope.newLotCategory = 'None';

    $scope.marketplaces = ['wholesaleninjas', 'bstock'];

    $scope.newLot = {
      unmanifested: true,
      destinationMarketplace: 'wholesaleninjas',
    };

    function buildHandleForPrefix(prefix) {
      const today = new Date();//fix time zone to EST

      const categoryDatePrefix = `${prefix}${today.getMonth()+1}.${today.getDate()}.${today.getFullYear()-2000}`;

      const query = {
        handle: { prefix: true, value: categoryDatePrefix }
      };
      return $http.post('/api/db/get', query).then(resp=>{
        const handlePattern = new RegExp(`${categoryDatePrefix}-([0-9]+)`);
        const existingLotNumbers = resp.data.reduce((numbers, lot) => {
          const lotNumberMatch = lot.handle.match(handlePattern);
          if(lotNumberMatch) {
            numbers.add(parseInt(lotNumberMatch[1]));
          }
          return numbers;
        }, new Set());
        let newLotNumber = 1;

        while(existingLotNumbers.has(newLotNumber))
          newLotNumber++;
        return `${categoryDatePrefix}-${newLotNumber}`;
      });
    }


    $scope.setHandleForCategory = function() {
      const categoryObj = lotCategories.find(x=>x.name===$scope.newLotCategory);
      if(categoryObj) {
        buildHandleForPrefix(categoryObj.prefix).then(handle => $scope.newLot.handle = handle);
      }
    };

    $scope.startQuickLot = function(quickLot) {
      buildHandleForPrefix(quickLot.handlePrefix).then(handle=>{
        Object.assign($scope.newLot, {
          handle: handle,
          unmanifested: true,
        });
        Object.assign($scope.newLot, quickLot.template);
        $scope.startLot();
      });
    };

    $scope.startCustomLot = function() {
      if(!$scope.newLot.handle) {
        $scope.noHandleSubmitted = true;
      }
      else {
        $scope.noHandleSubmitted = false;
        $scope.startLot();
      }
    };

    $scope.startLot = function() {
      if(!$scope.newLot.listingData) {
        listingBuilder.buildFromCategory($scope.newLot);
      }
      $http.post('/api/db/new-lot', $scope.newLot).then(resp=>{
        if(resp.data.error) {
          console.log(resp.data.error);
        }
        else if (resp.data.lotExists) {
          messageModal.launch({header: 'Error', body: `A lot with handle ${$scope.newLot.handle} already exists.`, type: 'error'});
        }
        else{
          const lot = resp.data;
          lotStore.save(lot);
          if(lot.unmanifested) {
            $state.go('main.lots.view', {lotId: lotStore._id});
          }
          else {
            $state.go('main.lots.scan');
          }
        }
      });
    };

  }
]);
