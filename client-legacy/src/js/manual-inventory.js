

export class ManualInventory {

  constructor( { inventory, groups, notes, reportDate } = {} ) {

    this.data = {
      inventory: inventory ? JSON.parse( JSON.stringify( inventory ) ) : [],
      groups: groups ? JSON.parse( JSON.stringify( groups ) ) : [],
      notes: notes || '',
      reportDate: reportDate || new Date(),
    };

  }

  clear() {
    this.data.inventory.splice( 0, this.data.inventory.length );
    this.data.groups.splice( 0, this.data.groups.length );
    this.data.notes = '';
    this.data.reportDate = new Date();
  }

  set( _inventory ) {
    this.clear();
    this.data.inventory.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.inventory) ) );
    this.data.groups.splice( 0, 0, ...JSON.parse( JSON.stringify(_inventory.groups) ) );
    this.data.notes = _inventory.notes;
    this.data.reportDate = _inventory.reportDate;
  }

  addInventory() { return this.data.inventory.push({ name: '', quantity: '' }); }

  removeInventory( idx ) { return this.data.inventory.splice( idx, 1 ); }

  addGroup( grp ) {

    if( !grp || this.data.groups.includes( grp ) ) {
      return;
    }

    this.data.groups.push( grp );

  }

  removeGroup( grp ) {

    if( !grp ) {
      return;
    }

    const foundIdx = this.data.groups.findIndex( _ => _ === grp );

    if( foundIdx >= 0 ) {

      this.data.groups.splice( foundIdx, 1 );

    }

  }

  isEmpty() { return !this.data.inventory.length; }

  isInvalid() {
    let invalid = false;

    if( this.isEmpty() ) {
      invalid = true;    
    }
    else {

      this.data.inventory.forEach( _ => { 
        
        _.nameInvalid = !_.name;
        _.quantityInvalid = typeof _.quantity !== 'number' || _.quantity < 0; 

      });

      invalid = this.data.inventory.some( _ => _.nameInvalid || _.quantityInvalid );

    }

    return invalid;
  }

  getData() { return this.data; }

}
