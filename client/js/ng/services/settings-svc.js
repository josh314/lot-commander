import angular from 'angular';

import * as api from '../../api';

const UserSettingsKey = user => `user-settings__${ user.get() }`;

/******************** Local User Settings Service ******************************/
angular.module('myApp').factory('LocalUserSettingsSvc', [ '$localStorage', 'LoggedInUser', function( $localStorage, LoggedInUser ) {

  return {
    get: get,
    reset: reset,
    save: save
  };

  function get( key ) {
    const userSettings = $localStorage[ UserSettingsKey( LoggedInUser ) ] || {};
    return userSettings[ key ];
  }

  function reset() {
    delete $localStorage[ UserSettingsKey( LoggedInUser ) ];
  }

  function save( key, value ) {

    const userSettings = get();

    $localStorage[ UserSettingsKey( LoggedInUser ) ] = Object.assign(
      userSettings || {},
      { [key]: value }
    );

  }

}]);


/******************** App Settings Service ******************************/
angular.module('myApp').factory('AppSettingsSvc', [

  '$q',

  function(

    $q,

  ) {

    return {
      list,
      getDefaultPriceValuePercentage,
      setDefaultPriceValuePercentage,
      updateValue
    };

    function list() {
      return $q.when( api.listAppSettings() );
    }

    function getDefaultPriceValuePercentage() {
      return $q.when( api.getAppSettingByName( 'defaultPriceValuePercentage' ).then( _ => _.value ) );
    }

    function setDefaultPriceValuePercentage( value ) {
      return  $q.when( api.setAppSettingValue( 'defaultPriceValuePercentage', value ) );
    }

    function updateValue( name, value ) {
      return $q.when( api.setAppSettingValue( name, value ) );
    }

  }
]);