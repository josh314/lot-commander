const {
  ResourceNotFoundError,
} = require('../errors');


const announcmentQueryFilter = ( { isActive } ) => {
  const filter = {};
  if( typeof isActive === 'boolean' ) {
    filter.isActive = isActive;
  }
  return filter;
};

class $_ {

  constructor( { Announcement } ) {
    this.Announcement = Announcement;
  }

  async list( { num, skip, sort, sortDir, filterParams }  ) {

    const filter = announcmentQueryFilter( filterParams );

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    };

    return this.Announcement.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams ).exec();

  }

  count( filterParams ) {

    const filter = announcmentQueryFilter( filterParams );

    return this.Announcement.countDocuments( filter );

  }

  async get( announcementId ) {
    const announcement = await this.Announcement.findById( announcementId );
    if( !announcement ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } );
    }
    return announcement;
  }

  async listCurrent() {

    const filterParams = {
      isActive: true
    };

    return this.list( { filterParams } );
  }

  async create( data ) {
    const announcement = new this.Announcement( data );
    await announcement.save();
    return { announcement };
  }

  async edit( announcementId, data ) {
    try {
      const announcement = await this.Announcement.findByIdAndUpdate( announcementId, data, { new: true } );
      return { announcement };
    }
    catch( _e ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } );
    }
  }

  async delete( announcementId ) {
    try {
      return this.Announcement.findByIdAndDelete( announcementId );
    }
    catch( _e ) {
      throw new ResourceNotFoundError( { type: 'announcement', id: announcementId } );
    }
  }

}

module.exports = $_;