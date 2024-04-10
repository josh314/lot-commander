
const {
  ResourceNotFoundError,
} = require('../errors');

class AppSettingsCommander {

  constructor( AppSetting ) {
    this.AppSetting = AppSetting;
  }

  async list() {
    // TODO: paging?
    const settings = await this.AppSetting.find();

    return { settings };
  }

  async getByName( name ) {
    const setting = await this.AppSetting.findOne( { name } );

    if( !setting ) {
      throw new ResourceNotFoundError( { type: 'app-setting', id: name } );
    }

    return { setting };
  }

  async setValue( name, newValue ) {
    const setting = await this.AppSetting.findOne( { name } );

    if( !setting ) {
      throw new ResourceNotFoundError( { type: 'app-setting', id: name } );
    }

    await setting.setValue( newValue );

    return { setting };

  }

  async create( { name, displayName, value, type } ) {
    const setting = new this.AppSetting( { name, displayName, value, type } );
    return setting.save();
  }

}

module.exports = AppSettingsCommander;