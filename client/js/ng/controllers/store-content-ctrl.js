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

function compareContent( c1, c2 ) {

  if( c1.namespace !== c2.namespace || c1.key !== c2.key) {
    return false;
  }

  if( c1.env === c2.env ) {
    return true;
  }
  else if( c1.env === 'staging' && !c2.env ) {
    return true;
  }
  else if ( c2.env === 'staging' && !c1.env ) {
    return true;
  }

  return false;

}

function isBlank( value ) {
  if( value === null || angular.isUndefined( value ) || value === '' ) {
    return true;
  }
}

function getListType( type ) {
  const match = type && type.match( /^list\.(.*)/ );
  if( match ) {
    return match[1];
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

function getInputType( type ) {

  if( isJsonType( type ) ) {
    return 'textarea';
  }
  else if( isNumberType( type ) ) {
    return 'number';
  }
  else if( type === 'color'  ) {
    return 'color';
  }
  else if( type === 'multi_line_text_field'  ) {
    return 'textarea';
  }
  else if( type === 'boolean'  ) {
    return 'boolean';
  }
  else {
    return 'text';
  }

}

function parseKey( key ) {

  if( !key ) {
    return {};
  }

  const [ k1, k2 ] = key.split('.');

  const group = k2 ? k1 : __GLOBAL_NAMESPACE__;
  const subkey = k2 ? k2 : k1;

  return { group, subkey };

}

class DisplayContent {
  constructor( { namespace, key, type, description } = {} ) {

    const listType = getListType( type );

    this.id = {};
    this.namespace = namespace;
    this.key = key;
    this.subkey = undefined;
    this.group = undefined;
    this.type = type;
    this.inputType = getInputType( listType || type );
    this.listType = listType;
    this.description = description;
    this.displayType = getDisplayType( listType || type );
    this.value = {};
    this.editValue = {};

    if( this.key ) {
      Object.assign( this, parseKey( this.key ) );
    }

  }

  setId( id, env ) {
    this.id[ env ] = id;
  }

  setValue( value, env ) {

    switch( this.type ) {
      case (this.type.match( /^list/ ) || {}).input:
        return this.setListValue( value, env );
      case 'json':
        try {
          value = JSON.parse( value );
        }
        catch(e) {
          'no-op';
        }
        if ( Array.isArray( value ) && ( !value.length || typeof value[0] === 'string') ) {
          this.listType = 'multi_line_text_field';
          this.displayType = getDisplayType( 'multi_line_text_field' );
          this.inputType = getInputType( 'multi_line_text_field' );
          return this.setListValue( value, env );
        }
        else {
          this.value[ env ] = JSON.stringify( value, null, 4 );
        }
        break;
      case 'dimension':
      case 'rating':
      case 'volume':
      case 'weight':
        try {
          value = JSON.parse( value );
        }
        catch(e) {
          'no-op';
        }
        this.value[ env ] = JSON.stringify( value, null, 4 );
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


  setListValue( value, env ) {

    const arr = Array.isArray( value ) ? value : JSON.parse( value );

    this.value[ env ] = arr.map( _v => {

      switch( this.listType ) {
        case 'dimension':
        case 'rating':
        case 'volume':
        case 'weight':
          try {
            _v = JSON.parse( _v );
          }
          catch(e) {
            'no-op';
          }
          return JSON.stringify( _v, null, 4 );
        case 'number_integer':
          return parseInt( _v );
        case 'number_decimal':
          return parseFloat( _v );
        default:
          return _v;
      }

    });

    this.editValue[ env ] = JSON.parse( JSON.stringify( this.value[ env ] ) );

  }

  isBlank( env ) {
    return isBlank( this.editValue[ env ] ); // This is the global isBlank() helper function, not the DisplayContent class method!
  }

  isDirty( env ) {

    let editValueDiffersFromValue = false;
    if( this.listType ) {

      editValueDiffersFromValue = ( JSON.stringify( this.editValue[ env ] ) !== JSON.stringify( this.value[ env ] ) );

    }
    else {

      editValueDiffersFromValue = ( this.editValue[ env ] !== this.value[ env ] );

    }

    return editValueDiffersFromValue;
  }

  revert( env ) {

    if( this.listType ) {

      this.editValue[ env ] = JSON.parse( JSON.stringify( this.value[ env ] ) );

    }
    else {

      this.editValue[ env ] = this.value[ env ] || '';

    }
  }

  isValid( env ) {

    if( this.isBlank( env ) ) {
      return false;
    }

    if( this.listType ) {

      if( !Array.isArray( this.editValue[ env ] ) ) {
        return false;
      }

      let res = true;
      for( let _v of this.editValue[ env ] ) {

        if( this.inputType === 'boolean' ) {
          res = res && _v === 'true' || _v === 'false';
        }
        else if( this.inputType === 'color' ) {
          res = res && !!_v.match( /^#[0-9a-fA-F]{6}$/ );
        }
        else if( this.inputType === 'number' ) {
          res = res && isNumeric( _v );
        }

      }

      return res;

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
    else if( this.type === 'color' ) {
      return !!this.editValue[ env ].match( /^#[0-9a-fA-F]{6}$/ );
    }
    else {
      return true;
    }

  }

  readyToStage() {
    return this.isDirty( 'staging' ) && this.isValid( 'staging' );
  }

  readyForProd() {

    let stagingDiffersFromProd = false;
    if( this.listType ) {

      stagingDiffersFromProd = ( JSON.stringify( this.editValue.staging ) !== JSON.stringify( this.value.prod ) );

    }
    else {

      stagingDiffersFromProd = ( this.editValue.staging !== this.value.prod );

    }

    return !this.isDirty( 'staging' ) && this.isValid( 'staging' ) && stagingDiffersFromProd;
  }

  newListValue() {

    if( this.listType ) {

      if( this.editValue.staging ) {
        this.editValue.staging.push( '' );
      }
      else {
        this.editValue.staging = [ '' ];
      }

    }

  }

  deleteListItem( $index ) {

    if( this.listType ) {

      this.editValue.staging.splice( $index, 1 );

    }

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

    function loadContentSchema() {

      return StoreContentSvc.getSchema().then( resp => {
        vm.contentSchema = resp.schema;
      } );

    }

    function dressContentFromSchema() {

      __ALL_CONTENT__.forEach( _content => {

        const _correspondingContentSchema = vm.contentSchema.find( _schema => _content.key === _schema.key );

        if( _correspondingContentSchema ) {
          _content.description = _correspondingContentSchema.description;
        }

      });

      const unsetCanonicalContent = vm.contentSchema.filter( _schema => !__ALL_CONTENT__.find( _content => _content.key === _schema.key ) );

      __ALL_CONTENT__ = __ALL_CONTENT__.concat( unsetCanonicalContent );

    }

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
      const { namespace, key, _value, editValue, type, listType } = content;

      if( isBlank( editValue[ env ] ) ) {
        throw new Error(`Invalid blank value.`);
      }

      const saveItem = {
        namespace,
        key,
        type
      };


      if( listType ) {
        saveItem.value = JSON.stringify( editValue[ env ] );
      }
      else if( isJsonType( type ) ) {
        try {
          JSON.parse( editValue[ env ] );
        }
        catch(e) {
          console.log('invalid JSON!');
          return false;
        }
        saveItem.value = editValue[ env ];
      }
      else {
        saveItem.value = editValue[ env ];
      }

      return StoreContentSvc.edit( saveItem, env ).then( metafield => {

        const content = metafield2Content( metafield, env );

        const idx = __ALL_CONTENT__.findIndex( _c => compareContent( _c, content ) );

        if( idx >= 0 ) {
          __ALL_CONTENT__.splice( idx, 1, content );
        }
        else {
          __ALL_CONTENT__.push( content );
        }

        refreshDisplayContent( parseKey( metafield.key ).group );

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

      const contentToDelete = Object.entries( content.id ).map( entry => ( {
        ownerId: '',
        namespace: content.namespace,
        key: content.key,
        env: entry[0]
      } ) );

      return StoreContentSvc.deleteMany( contentToDelete ).then( responses => {

        for( let resp of responses ) {

          const { deletedContent } = resp;

          if( deletedContent && deletedContent.namespace && deletedContent.key && deletedContent.env ) {

            const idx = __ALL_CONTENT__.findIndex( _c => _c.namespace === deletedContent.namespace && _c.key === deletedContent.key && _c.env === deletedContent.env );

            if( idx >= 0 ) {

              const _correspondingContentSchema = vm.contentSchema.find( _schema => __ALL_CONTENT__[idx].key === _schema.key );

              if( _correspondingContentSchema ) {

                __ALL_CONTENT__[idx] = new DisplayContent( __ALL_CONTENT__[idx] );

              }
              else {
                __ALL_CONTENT__.splice( idx, 1 );
              }

            }

          }
        }

        refreshDisplayContent( content.group );

      });

    }

    function focusOnContent( key, env ) {
      focus(`content-input-${key}-${env}`);
    }

    function refreshDisplayContent( defaultDisplayGroupName ) {

      dressContentFromSchema();

      const allDisplayContent = [];
      for( let _c of __ALL_CONTENT__ ) {

        let dv = allDisplayContent.find( _dv => _dv.key === _c.key );
        if( !dv ) {
          dv = new DisplayContent( {
            namespace: _c.namespace,
            key: _c.key,
            type: _c.type,
            description: _c.description
          } );
          allDisplayContent.push( dv );
        }

        if( _c.env ) {
          dv.setValue( _c.value, _c.env );
          dv.setId( _c.id, _c.env );
        }

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

      if( defaultDisplayGroupName ) {
        const found = vm.displayContentGroups.find( _g => _g.name === defaultDisplayGroupName );
        vm.displayGroup = found;
      }

      vm.displayGroup = vm.displayGroup || vm.displayContentGroups[0];

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

      loadContentSchema()
        .then( refreshContent )
        .then( _ => focusOnContent('0') );

      vm.newContent = new DisplayContent();
    }
    init();

  }
]);

