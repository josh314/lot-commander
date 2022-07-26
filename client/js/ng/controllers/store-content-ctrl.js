import angular from 'angular';

/**********************************************
 * Helpers & globals
 * =======
 *
 *********/
const __GLOBAL_NAMESPACE__ = '<GLOBAL>';
const __ENV_OPTIONS__ = [
  'prod',
  'staging',
];

let __ALL_CONTENT__ = [];

function isNumeric( n ) {
  if( typeof n === 'number' ) {
    return true;
  }
  else if ( angular.isString( n ) ) {

    const p = /^\d*\.?\d+$/;

    return !!n.match(p);
  }

  return false;
}

function metafield2Content( m, env ) {
  return Object.assign( {} , m, { env } );
}

function contentIsEqual( c1, c2 ) {
  return (c1.namespace === c2.namespace) && (c1.key === c2.key) && (c1.env === c2.env);
}

function isBlank( value ) {
  if( value === null || angular.isUndefined( value ) || value === '' ) {
    return true;
  }
}

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

function isNumberType( type ) {
  switch( type ) {
    case 'number_integer':
    case 'number_decimal':
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

function getDisplayType( type ) {
  if( isJsonType( type ) ) {
    return 'JSON';
  }
  else if( isNumberType( type ) ) {
    return 'number';
  }
  else if( type === 'single_line_text_field'  ) {
    return 'single line plain text';
  }
  else if( type === 'multi_line_text_field'  ) {
    return 'plain text';
  }
  else if( type === 'boolean'  ) {
    return 'true/false';
  }
  else {
    return type;
  }
}

class DisplayContent {
  constructor( { namespace, key, type } = {} ) {
    this.id = {};
    this.namespace = namespace;
    this.key = key;
    this.type = type;
    this.displayType = getDisplayType( type );
    this.value = {};
    this.editValue = {};

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

  setId( id, env ) {
    this.id[ env ] = id;
  }

  setValue( value, env ) {

    switch( this.type ) {
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
        this.value[ env ] = JSON.stringify( value, null, 4 );
        break;
      case 'multi_line_text_field':
        this.value[ env ] = value;
        break;
      case 'number_integer':
        this.value[ env ] = parseInt( value );
        break;
      case 'number_decimal':
        this.value[ env ] = parseFloat( value );
        break;
      default:
        this.value[ env ] = value;
        break;
    }

    this.editValue[ env ] = this.value[ env ];

  }

  isBlank( env ) {
    return isBlank( this.editValue[ env ] ); // This is the global isBlank() helper function, not the DisplayContent class method!
  }

  isDirty( env ) {
    return ( this.editValue[ env ] !== this.value[ env ] );
  }

  revert( env ) {
    this.editValue[ env ] = this.value[ env ] || '';
  }

  isValid( env ) {

    if( this.isBlank( env ) ) {
      return false;
    }

    if( isJsonType( this.type ) ) {
      try {
        JSON.parse(this.editValue[ env ]);
        return true;
      }
      catch(e) {
        return false;
      }
    }
    else if( isNumberType( this.type ) ) {
      return isNumeric( this.editValue[ env ] );
    }
    else if( this.type === 'boolean' ) {
      return this.editValue[ env ] === 'true' || this.editValue[ env ] === 'false';
    }
    else {
      return true;
    }

  }

  readyToStage() {
    return this.isDirty( 'staging' ) && this.isValid( 'staging' );
  }

  readyForProd() {
    return !this.isDirty( 'staging' ) && this.isValid( 'staging' ) && this.editValue.staging !== this.editValue.prod;
  }

}

/******************* Store Content Controller *************************/
angular.module('myApp').controller('StoreContentCtrl', [

  'focus',
  'LoggedInUser',
  'ModalSvc',
  'StoreContentSvc',
  'sessionTimeout',

  function(

    focus,
    LoggedInUser,
    ModalSvc,
    StoreContentSvc,
    sessionTimeout

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showDeveloper = LoggedInUser.isDeveloper();

    function refreshContent() {

      vm.waitingForResponse = true;
      const content = {
        prod: [],
        staging: [],
      };

      const requests = [];
      for( let env of __ENV_OPTIONS__ ) {

        const p = StoreContentSvc.list( env ).then( resp => {
          content[ env ] = resp.content.map( _c => metafield2Content( _c , env ) );
        });
        requests.push(p);

      }

      return Promise.all( requests ).then( _ => {
        vm.waitingForResponse = false;
        __ALL_CONTENT__ = content.prod.concat( content.staging );
        return refreshDisplayContent( );
      });

    }

    async function stageContent( content ) {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Stage content',
        body: `Data will be deployed to staging site. Continue?`,
      });

      if( !isConfirmed ) {
        return;
      }

      return saveContent( content, 'staging' );

      // TODO: messageModal confirming the update to staging store, and providing link
      // TODO: encourage viewing the staging site before moving onto production
    }

    async function deployToProd( content ) {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Deploy to production',
        html: `<p>Staged data will be deployed to production site.</p>
              <p>This content will overwrite the current content on the <span class="text-danger">LIVE</span> production site and cannot be undone.</p>
              <p>Continue?</p>`,
      });

      if( !isConfirmed ) {
        return;
      }

      // Set prod value to staging value
      content.setValue( content.editValue.staging, 'prod' );

      return saveContent( content, 'prod' );

      // TODO: messagemodal: site has been updated

    }

    function saveContent( content, env ) {
      const { namespace, key, _value, editValue, type } = content;

      if( isBlank( editValue[ env ] ) ) {
        throw new Error(`Invalid blank value.`);
      }

      if( isJsonType( type ) ) {
        try {
          JSON.parse( editValue[ env ] );
        }
        catch(e) {
          console.log('invalid JSON!');
          return false;
        }
      }

      const saveItem = {
        namespace,
        key,
        value: editValue[ env ],
        type
      };

      return StoreContentSvc.edit( saveItem, env ).then( metafield => {

        const content = metafield2Content( metafield, env );

        const idx = __ALL_CONTENT__.findIndex( _c => contentIsEqual( _c, content ) );

        if( idx >= 0 ) {
          __ALL_CONTENT__.splice( idx, 1, content );
        }
        else {
          __ALL_CONTENT__.push( content );
        }
        refreshDisplayContent();


      } )
        .catch( e => {
          console.error(e);
          return null;
        });

    }

    async function deleteContent( content ) {

      const isConfirmed = await ModalSvc.confirm({
        header: 'Delete content',
        body: 'Delete content from both production and staging environments?',
      });

      if( !isConfirmed ) {
        return;
      }

      const contentToDelete = Object.entries( content.id ).map( entry => ( { gid: entry[1], env: entry[0] } ) );

      return StoreContentSvc.deleteMany( contentToDelete ).then( responses => {

        for( let resp of responses ) {
          if( resp.deletedId ) {

            const idx = __ALL_CONTENT__.findIndex( _c => _c.id === resp.deletedId );

            if( idx >= 0 ) {
              __ALL_CONTENT__.splice( idx, 1 );
            }

          }
        }

        refreshDisplayContent();

      });

    }

    function focusOnContent( key, env ) {
      focus(`content-input-${key}-${env}`);
    }

    function refreshDisplayContent(  ) {

      const allDisplayContent = [];
      for( let _c of __ALL_CONTENT__ ) {

        let dv = allDisplayContent.find( _dv => _dv.key === _c.key );
        if( !dv ) {
          dv = new DisplayContent( {
            namespace: _c.namespace,
            key: _c.key,
            type: _c.type
          } );
          allDisplayContent.push( dv );
        }

        dv.setValue( _c.value, _c.env );
        dv.setId( _c.id, _c.env );
      }
      vm.allDisplayContent = allDisplayContent;

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
      return saveContent( content, 'staging' ).then( _ => {
        vm.newContent = new DisplayContent();
      });
    }

    function init() {

      vm.envOptions = __ENV_OPTIONS__;

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
      vm.displayContentGroups = {
        prod: [],
        staging: []
      };
      vm.allDisplayContent = [];
      // vm.filter = {
      //   includePallets: false,
      //   productName: ''
      // };

      vm.refreshContent = refreshContent;
      vm.refreshDisplayContent = refreshDisplayContent;
      vm.stageContent = stageContent;
      vm.deployToProd = deployToProd;
      vm.deleteContent = deleteContent;
      vm.focusOnContent = focusOnContent;
      vm.createContentMetafield = createContentMetafield;

      refreshContent( ).then( _ => focusOnContent('0') );
      vm.newContent = new DisplayContent();
    }
    init();

  }
]);