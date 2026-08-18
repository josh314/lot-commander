import * as path from 'path';
import angular from 'angular';
import * as api from '../../api';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('ListManifestsCtrl', ['$q',
  function($q) {
    const vm = this;
    vm.manifests = [];


    function getManifestList() {
      return api.listManifests().then( manifests => {
        return manifests.map( item => {
          item.displayName = path.basename(item.name);
          item.link = `/api/manifests/${item.name}`;
          return item;
        });
      });
    }

    // Load manifests
    $q.when(getManifestList()).then(manifests => { 
      vm.manifests = manifests;
    });

  }
]);
