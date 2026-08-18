import angular from "angular";


/******************* App Settings Controller *************************/
angular.module('myApp').controller( 'AppSettingsCtrl', [

  'AppSettingsSvc',
  'LoggedInUser',

  function(

    AppSettingsSvc,
    LoggedInUser

  ) {

    class DisplayAppSetting {
      constructor( { _id, name, displayName, value, type } ) {
        Object.assign(
          this,
          {
            _id,
            name,
            displayName,
            value,
            type,
            editValue: value,
            isSaved: false,
          }
        );
      }

      isDirty() {
        return this.value !== this.editValue;
      }

      disableEditValue() {
        return !LoggedInUser.hasPermission( 'EDIT_APP_SETTING' );
      }

      showEditControls() {
        return LoggedInUser.hasPermission( 'EDIT_APP_SETTING' ) && this.isDirty();
      }

      showResetButton() {
        return this.isDirty();
      }

      reset() {
        this.editValue = this.value;
        this.isSaved = false;
      }

      updateValue() {

        if( this.isDirty() ) {

          return AppSettingsSvc.updateValue( this.name, this.editValue ).then( _ => this.value = this.editValue, this.isSaved = true );

        }

      }
    }

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          showEditControls: LoggedInUser.hasPermission( 'EDIT_APP_SETTING' ),

          settings: [],

        }
      );

      AppSettingsSvc.list().then( settings => {
        vm.settings = settings.map( setting => new DisplayAppSetting( setting ) );
      });

    }

  }
]);