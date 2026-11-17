import { Schema, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'

import { appSettingTypeNames, appSettingTypeGuards, type AppSettingTypeName, type AppSettingValue } from '@shared/enums'
import { IllegalActionError } from '../errors'


export interface AppSettingData {
  name: string
  displayName: string
  value: AppSettingValue
  type: AppSettingTypeName
}

export type AppSettingRecord = DataRecord<AppSettingData>

export type AppSettingMethods = {
  setValue: (newValue: AppSettingValue) => Promise<AppSetting>
}

export type AppSetting = HydratedDocument<AppSettingRecord, AppSettingMethods>

export type AppSettingModel = ModelFor<AppSettingData, AppSettingMethods, AppSetting, AppSettingRecord>



/*******************************
 * App Setting schema
 * =============================
 *
 ******/

export const appSettingSchema = new Schema<AppSettingData,AppSettingModel, AppSettingMethods, object, object, object, object, AppSettingRecord, AppSetting>(
  {
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: {
      type: String,
      enum: appSettingTypeNames,
      required: true
    }
  },

  {
    methods: {
      setValue: function(newValue: AppSettingValue ) {
        this.value = newValue
        return this.save()
      }
    },
    collection: 'app-settings',
    timestamps: true
  }
)

appSettingSchema.pre('save', function() {

  if( !appSettingTypeGuards[this.type](this.value) ) {
    throw new IllegalActionError(`Invalid app setting value type: expected ${this.type}, got ${typeof this.value}`)
  }

})