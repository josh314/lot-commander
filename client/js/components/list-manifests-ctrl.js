import * as path from 'path';
import angular from 'angular';
import * as api from '../api';

/******************* Manifest Cleaner Controller *************************/
angular.module('myApp').controller('ListManifestsCtrl', ['$q', 'sessionTimeout',  
  function($q, sessionTimeout) {
    sessionTimeout.init();

    const vm = this;
    vm.manifests = [];


    function getManifestList() {
      return api.listManifests().then( resp => {
        return resp.manifests.map( item => {
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
