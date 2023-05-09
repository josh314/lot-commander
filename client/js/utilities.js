
export function humanReadableFileSize( size ) {

  if( size > 1024*1024 ) {
    return `${(size/1024/1024).toFixed(2)} MB`;
  }
  else if ( size > 1024 ) {
    return `${(size/1024).toFixed(2)} KB`;
  }
  else {
    return `${size} B`;
  }

}

export function prettifyDate (dt) {
  return dt && dt.toLocaleDateString ? dt.toLocaleDateString() : dt;
}


export function prettifyDateTime( dt ) {

  if( dt ) {

    const _ = typeof dt === Date ? _ : new Date(dt);

    return _.toLocaleString();

  }

}



const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

export function displayAsMoney( num ) {

  if( !num ) return;

  return currencyFormatter.format( num );

}

export function htmlifyText( txt ) {
  return txt ? txt.split("\n").join('<br/>') : txt;
}

// I'm a little skeptical of this. I would only use it for POD objects, not ones with prototypes, methods, etc
export function isEqual (var1, var2) {
  if (typeof var1 === 'object' && typeof var2 === 'object') {

    // Checking equality for each of the inner values of the objects
    const keys = [...new Set([...Object.keys(var1),...Object.keys(var2)])];
    return keys.every(key => isEqual(var1[key], var2[key]) && isEqual(var2[key], var1[key]));

  }
  else { // Primitive types (number, boolean etc..)
    return var1 === var2; // Normal equality
  }
}


export function isNan( x ) {
  return parseInt( x ) !== parseInt( x );
}

export function createSubobject( obj, fields ) {

  const subobj = {};
  for( let f of fields ) {
    subobj[ f ] = obj[ f ];
  }

  return subobj;
}
