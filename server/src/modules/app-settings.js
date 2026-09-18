
const {
  ResourceNotFoundError,
} = require('../errors');

const BOOLEAN_CACHE_TTL_MS = 30 * 1000;

class AppSettingsCommander {

  constructor( AppSetting ) {
    this.AppSetting = AppSetting;
    this.booleanCache = new Map();
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

    this.booleanCache.delete( name );

    return { setting };

  }

  // Cached boolean read for settings checked on hot paths (e.g. per-request feature flags).
  // Defaults to `defaultValue` when the setting hasn't been created yet, so existing behavior
  // is unaffected until an admin explicitly creates/toggles the setting.
  async isEnabled( name, { defaultValue = true } = {} ) {

    const cached = this.booleanCache.get( name );
    if( cached && cached.expiresAt > Date.now() ) {
      return cached.value;
    }

    const setting = await this.AppSetting.findOne( { name } ).lean();
    const value = setting ? Boolean( setting.value ) : defaultValue;

    this.booleanCache.set( name, { value, expiresAt: Date.now() + BOOLEAN_CACHE_TTL_MS } );

    return value;

  }

  async create( { name, displayName, value, type } ) {
    const setting = new this.AppSetting( { name, displayName, value, type } );
    return setting.save();
  }

}

module.exports = AppSettingsCommander;