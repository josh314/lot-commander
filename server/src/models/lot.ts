import { Schema, Types, HydratedDocument } from 'mongoose'
import type { DataRecord, ModelFor } from './utils'
import { shippingItemSchema, type ShippingItem } from './shipping-item'
import { lotMediaSchema, type LotMediaData, type LotMedia, type LotMediaArray } from './lot-media'
import { setPackagingTypeFromShippingItems } from './set-packaging-type-from-shipping-items'
import * as enums from '@shared/enums'
import type { LotStatus, Condition, Marketplace, PackagingType } from '@shared/enums'
import { ChildResourceNotFoundError, IllegalActionError } from '../errors'
import { __DEFAULT_PRICE_VALUE_PCT__ } from '../constants'

/*************************************************
 * Types
 * =====
 *
 ********/

export type MediaType = 'images' | 'videos'

interface SubmittedListing {
  marketplace: string
  dateSubmitted: Date
  success: boolean
  message: string
  shopify: {
    store: string
    productId: number
    productVariantId: number
    handle: string
  }
}

interface ThirdPartyManifest {
  dbId?: string
  blockId?: string
  filename?: string
}

export interface LotData {

  handle: string
  lotNumber?: number
  pallet?: Types.ObjectId
  description?: string
  type?: Condition
  category?: string
  totalUnits?: number
  estimatedRetailValue?: number
  priceValuePercentage?: number
  status: LotStatus
  destinationMarketplace?: Marketplace
  submittedListings: Array<SubmittedListing>
  listingData?: {
    title: string
    body: string
  }
  listedDate?: Date
  soldDate?: Date
  shippedDate?: Date
  images: Array<LotMedia>
  videos: Array<LotMedia>
  unmanifested?: boolean
  manifestId?: string
  thirdPartyManifests: Array<ThirdPartyManifest>
  manifestFileLocation?: string
  numBoxes?: number
  packagingType?: PackagingType
  shippingItems: Array<ShippingItem>
  isDeleted?: boolean

}

export type LotRecord =  DataRecord<LotData>

interface MediaSaveOptions {
  save?: boolean
}

interface LotMethods {
  setPackagingTypeFromShippingItems: () => void
  edit: (data: Partial<LotData>) => Promise<Lot>
  ship: () => Promise<Lot>
  unship: () => Promise<Lot>
  markAsSold: (date: string) => Promise<Lot>
  getMediaArray: (mediaType: MediaType) => LotMediaArray
  getMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType) => LotMedia | null
  getMediaOrThrow: ( mediaId: string | Types.ObjectId, mediaType: MediaType) => LotMedia
  addMedia: ( media: LotMediaData, mediaType: MediaType, options?: MediaSaveOptions) => Promise<{ lot: Lot, media: LotMedia }>
  removeMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, options?: MediaSaveOptions) => Lot | Promise<Lot>
  setPrimaryMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, options?: MediaSaveOptions ) => Lot | Promise<Lot>
  finishProcessingMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, s3Location: string, options?: MediaSaveOptions) => Promise<{ lot: Lot, media: LotMedia | null }>
}

// overwrite HydratedDocument to include arrays as Types.DocumentArray for certain fields
export type Lot = HydratedDocument<LotRecord, LotMethods> & {
  images: LotMediaArray
  videos: LotMediaArray
  shippingItems: Types.DocumentArray<ShippingItem>
}

export type LotModel = ModelFor<LotData, LotMethods, Lot, LotRecord>

/*************************************************
 * Schema
 * ======
 *
 ********/

// define the schema for our lot model
export const lotSchema = new Schema<LotData, LotModel, LotMethods, object, object, object, object, LotRecord, Lot>(

  {
    handle: {
      type: String,
      required: true
    },
    lotNumber: Number,
    pallet: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryPallet'
    },
    description: String,
    type: { type: String, enum: enums.conditions },
    category: String,
    totalUnits: Number,
    estimatedRetailValue: Number,
    priceValuePercentage: Number,
    status: { type: String, enum: enums.lotStatuses, default: enums.lotStatuses[0], required: true },

    /*********** Listing properties ************/
    destinationMarketplace: { type: String, enum: enums.marketplaces },
    submittedListings: [{
      _id: false,
      marketplace: String,
      dateSubmitted: Date,
      success: Boolean,
      message: String,
      shopify: {
        store: String,
        productId: Number,
        productVariantId: Number,
        handle: String,
      }
    }],
    listingData: {
      _id: false,
      title: String,
      body: String,
    },

    listedDate: Date,
    soldDate: Date,
    shippedDate: Date,

    images: [ lotMediaSchema ],
    videos: [ lotMediaSchema ],

    /*********** Manifest properties ************/
    unmanifested: Boolean, //marks a generic lot with unmanifested items.
    manifestId: String, // _id from manifets-db for manifests we've scanned ourselves
    thirdPartyManifests: [{
      _id: false,
      dbId: String,//either this or filename
      blockId: String,
      filename: String, //either this or dbId
    }],
    manifestFileLocation: String,

    /******* Shipping properties ***************/

    numBoxes: Number, // DEPRECATED: use shippingItems for new data

    packagingType: { type: String, enum: enums.packagingTypes },
    shippingItems: [ shippingItemSchema ],

    isDeleted: { type: Boolean, default: false, required: true },

  },

  {
    collection: 'lots',
    timestamps: true,
    strict: true,

    methods: {
      setPackagingTypeFromShippingItems,

      edit: function( data: Partial<LotData> ) {

        Object.assign( this, data )
        return this.save()

      },

      ship: function() {

        this.status = 'Shipped'
        this.shippedDate = new Date()
        return this.save()

      },

      unship: function() {

        this.status = 'Sold'
        this.shippedDate = undefined
        return this.save()

      },

      markAsSold: function( date: string ) {

        this.status = 'Sold'
        this.soldDate = date ? new Date( date ) : new Date()
        return this.save()

      },

      getMediaArray: function( mediaType: MediaType ) {

        if( mediaType !== 'images' && mediaType !== 'videos' ) {
          /* eslint-disable @typescript-eslint/restrict-template-expressions */
          throw new IllegalActionError( `Invalid media type: ${ mediaType }` )
          /* eslint-enable @typescript-eslint/restrict-template-expressions */
        }

        return this[ mediaType ]
      },

      getMedia: function( mediaId: string | Types.ObjectId, mediaType: MediaType ) {

        const arr = this.getMediaArray( mediaType )
        return arr.id( mediaId )

      },

      getMediaOrThrow: function( mediaId: string | Types.ObjectId, mediaType: MediaType ) {

        const media = this.getMedia( mediaId, mediaType )
        if( !media ) {
          throw new ChildResourceNotFoundError( {
            parentType: 'lot',
            parentId: this._id,
            childType: mediaType,
            childId: mediaId
          } )
        }

        return media
      },

      addMedia: async function( media: LotMediaData, mediaType: MediaType, { save } = { save: true } ) {

        const arr = this.getMediaArray( mediaType )
        const newMedia = arr.create( { ...media, _id: new Types.ObjectId() } )
        arr.push( newMedia )

        if( save ) {
          await this.save()
        }

        return { lot: this, media: newMedia }

      },

      removeMedia: function( mediaId: string | Types.ObjectId, mediaType: MediaType, { save } = { save: true } ) {

        const arr = this.getMediaArray( mediaType )

        const foundMedia = this.getMediaOrThrow( mediaId, mediaType )
        arr.pull( foundMedia._id )

        return save ? this.save() : this
      },

      setPrimaryMedia: function( mediaId: string | Types.ObjectId, mediaType: MediaType, { save } = { save: true } ) {

        const arr = this.getMediaArray( mediaType )

        const foundMediaNewPrimary = this.getMediaOrThrow( mediaId, mediaType )

        const oldPrimaryMedia = arr.find( item => item.primary )
        if( oldPrimaryMedia === foundMediaNewPrimary ){
          return this
        }

        foundMediaNewPrimary.primary = true
        if( oldPrimaryMedia ) {
          oldPrimaryMedia.primary = false
        }

        return save ? this.save() : this
      },

      finishProcessingMedia: async function( mediaId: string | Types.ObjectId, mediaType: MediaType, s3Location: string, { save } = { save: true } ) {

        const arr = this.getMediaArray( mediaType )
        const media = arr.id( mediaId )

        if( media ) {

          media.finishProcessing( s3Location )

          if( save ) {
            await this.save()
          }

        }


        return { lot: this, media }

      },

    }
  }

)



/***********************
 *  Middleware
 *
 ******/

// Doing this here prevents errors from empty packagingType
lotSchema.pre( 'validate', function() {

  this.setPackagingTypeFromShippingItems()

} )

lotSchema.pre( 'save', function() {

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = __DEFAULT_PRICE_VALUE_PCT__
  }

} )

