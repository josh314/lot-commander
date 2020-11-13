import angular from 'angular';

const UserSettingsKey = user => `user-settings__${ user.get() }`;

/******************** Settings Service ******************************/
angular.module('myApp').factory('SettingsSvc', [ '$localStorage', 'LoggedInUser', function( $localStorage, LoggedInUser ) { 

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
