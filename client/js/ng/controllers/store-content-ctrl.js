import angular from 'angular';

/**********************************************
 * Helpers
 * =======
 *
 *********/

function isJsonType( type ) {
  switch( type ) {
    case 'dimension':
    case 'json':
    case 'rating':
    case 'volume':
    case 'weight':
      return true;
    default:
      return false;
  }
}

class DisplayContent {
  constructor( { id, namespace, key, value, type } = {} ) {
    this.id = id;
    this.namespace = namespace;
    this.key = key;
    this.type = type;

    switch( type ) {
      case 'dimension':
      case 'json':
      case 'rating':
      case 'volume':
      case 'weight':
        try {
          value = JSON.parse(value);
        }
        catch(e) {
          'no-op';
        }
        this.value = JSON.stringify( value, null, 4 );
        break;
      case 'multi_line_text_field':
        this.value = value;
        break;
      case 'number_integer':
        this.value = parseInt( value );
        break;
      case 'number_decimal':
        this.value = parseFloat( value );
        break;
      default:
        this.value = value;
        break;
    }

    this.displayValue = this.value;

  }

  isDirty() {
    return (this.displayValue !== this.value) && (this.displayValue !== '');
  }

  revert() {
    this.displayValue = this.value || '';
  }

  isValid() {

    if( isJsonType( this.type ) ) {
      try {
        JSON.parse(this.displayValue);
        return true;
      }
      catch(e) {
        return false;
      }
    }

    return true;

  }

}

/******************* Store Content Controller *************************/
angular.module('myApp').controller('StoreContentCtrl', [

  'focus',
  'StoreContentSvc',
  'sessionTimeout',

  function(

    focus,
    StoreContentSvc,
    sessionTimeout

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    function refreshContent() {

      vm.waitingForResponse = true;
      return StoreContentSvc.list().then( resp => {
        vm.allDisplayContent = resp.content.map( _c => new DisplayContent( _c ) );
        refreshVisibleDisplayContent( );
        vm.waitingForResponse = false;

      });

    }

    function saveContent( content ) {
      const { namespace, key, _value, displayValue, type } = content;

      if( isJsonType( type ) ) {
        try {
          JSON.parse(displayValue);
        }
        catch(e) {
          console.log('invalid JSON!');
          return false;
        }
      }

      const saveItem = {
        namespace,
        key,
        value: displayValue,
        type
      };

      return StoreContentSvc.edit( saveItem ).then( metafield => {

        try{

          const displayContent = new DisplayContent( metafield );

          const idx = vm.allDisplayContent.findIndex( _r => _r.id === displayContent.id );

          if( idx >= 0 ) {
            vm.allDisplayContent.splice( idx, 1, displayContent );
          }
          else {
            vm.allDisplayContent.push( displayContent );
          }
          refreshVisibleDisplayContent();

        }
        catch(e) {
          console.error(e);
          return null;
        }

      } );

    }

    function revertContent( displayContent ) {
      displayContent.revert();
    }

    function focusOnContent( index ) {
      focus(`content-input-${index}`);
    }

    function refreshVisibleDisplayContent() {
      vm.visibleDisplayContent = vm.allDisplayContent;//.filter( _dr => _dr.titleMatches( vm.filter.productName ) );
    }

    function init() {

      vm.waitingForResponse = false;
      vm.allDisplayContent =[];
      vm.visibleDisplayContent = [];
      // vm.filter = {
      //   includePallets: false,
      //   productName: ''
      // };
      vm.refreshContent = refreshContent;
      vm.refreshVisibleDisplayContent = refreshVisibleDisplayContent;
      vm.saveContent = saveContent;
      vm.revertContent = revertContent;
      vm.focusOnContent = focusOnContent;

      refreshContent().then( _ => focusOnContent('0') );

    }
    init();

  }
]);