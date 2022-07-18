import angular from 'angular';

/**********************************************
 * Helpers
 * =======
 *
 *********/
const __GLOBAL_NAMESPACE__ = '<GLOBAL>';

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

function alphaTextCmp( a, b ) {
  if( a < b ) {
    return -1;
  }
  else if ( a > b ) {
    return +1;
  }
  else {
    return 0;
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

    if( this.key ) {
      const [ k1, k2 ] = this.key.split('.');

      if( !k2 ) {
        this.group = __GLOBAL_NAMESPACE__;
        this.subkey = k1;
      }
      else {
        Object.assign( this, { group: k1, subkey: k2 } );
      }
    }

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
    if( this.type === 'boolean' ) {
      return this.displayValue === 'true' || this.displayValue === 'false';
    }

    return true;

  }

}

/******************* Store Content Controller *************************/
angular.module('myApp').controller('StoreContentCtrl', [

  'focus',
  'LoggedInUser',
  'StoreContentSvc',
  'sessionTimeout',

  function(

    focus,
    LoggedInUser,
    StoreContentSvc,
    sessionTimeout

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showDeveloper = LoggedInUser.isDeveloper();

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

    function deleteContent( gid ) {
      StoreContentSvc.delete( gid ).then( resp => {
        if( resp.deletedId ) {

          const idx = vm.allDisplayContent.findIndex( _r => _r.id === resp.deletedId );

          if( idx >= 0 ) {
            vm.allDisplayContent.splice( idx, 1 );
          }

          refreshVisibleDisplayContent();

        }
      });
    }

    function focusOnContent( index ) {
      focus(`content-input-${index}`);
    }

    function refreshVisibleDisplayContent() {

      const groups = [];

      for( let _c of vm.allDisplayContent ) {

        const group = groups.find( _g => _g.name === _c.group );

        if( group ) {
          group.content.push( _c );
        }
        else {
          groups.push( { name: _c.group, content: [ _c ] } );
        }
      }

      for( let _g of groups ) {
        _g.content = _g.content.sort( (a,b) => alphaTextCmp( a.subkey, b.subkey ) );
      }

      vm.displayContentGroups = groups.sort( (a,b) => {
        if( a.name === __GLOBAL_NAMESPACE__ ) {
          return -1;
        }
        else if ( b.name === __GLOBAL_NAMESPACE__ ) {
          return +1;
        }
        else {
          return alphaTextCmp( a.name, b.name );
        }
      });
    }

    function createContentMetafield( content ) {
      return saveContent( content ).then( _ => {
        vm.newContent = new DisplayContent();
      });
    }

    function init() {

      vm.metafieldTypeOptions = [
        'single_line_text_field',
        'number_integer',
        'boolean',
        'color',
        'date',
        'date_time',
        'dimension',
        'file_reference',
        'json',
        'multi_line_text_field',
        'number_decimal',
        'page_reference',
        'product_reference',
        'rating',
        'url',
        'variant_reference',
        'volume',
        'weight'
      ];

      vm.waitingForResponse = false;
      vm.allDisplayContent =[];
      vm.displayContentGroups = [];
      // vm.filter = {
      //   includePallets: false,
      //   productName: ''
      // };

      vm.refreshContent = refreshContent;
      vm.refreshVisibleDisplayContent = refreshVisibleDisplayContent;
      vm.saveContent = saveContent;
      vm.revertContent = revertContent;
      vm.deleteContent = deleteContent;
      vm.focusOnContent = focusOnContent;
      vm.createContentMetafield = createContentMetafield;

      refreshContent().then( _ => focusOnContent('0') );
      vm.newContent = new DisplayContent();
    }
    init();

  }
]);