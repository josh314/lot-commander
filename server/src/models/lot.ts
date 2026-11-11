import { Schema, Model, Types } from 'mongoose'
import { shippingItemSchema, type ShippingItem } from './shipping-item'
import { lotMediaDataSchema, type ILotMediaData, type THydratedLotMediaData } from './lot-media-data'
import { setPackagingTypeFromShippingItems } from './set-packaging-type-from-shipping-items'
import * as enums from '@shared/enums'
import { ChildResourceNotFoundError, IllegalActionError } from '../errors'
import { __DEFAULT_PRICE_VALUE_PCT__ } from '../constants'

/*************************************************
 * Types
 * =====
 *
 ********/

export type MediaType = 'images' | 'videos'

export interface ILot {

  handle: string
  lotNumber?: number
  pallet?: string
  description?: string
  type?: string
  category?: string
  totalUnits?: number
  estimatedRetailValue?: number
  priceValuePercentage?: number
  status: string
  destinationMarketplace?: string
  submittedListings: Types.DocumentArray<{
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
  }>
  listingData?: {
    title: string
    body: string
  }
  listedDate?: Date
  soldDate?: Date
  shippedDate?: Date
  images: Types.DocumentArray<ILotMediaData>
  videos: Types.DocumentArray<ILotMediaData>
  unmanifested?: boolean
  manifestId?: string
  thirdPartyManifests: Types.DocumentArray<{
    dbId?: string
    blockId?: string
    filename?: string
  }>
  manifestFileLocation?: string
  numBoxes?: number
  packagingType?: string
  shippingItems: Types.DocumentArray<ShippingItem>
  isDeleted?: boolean
}

interface MediaSaveOptions {
  save?: boolean
}

interface ILotMethods {
  setPackagingTypeFromShippingItems: () => void
  edit: (data: Partial<ILot>) => Promise<ILot>
  ship: () => Promise<ILot>
  unship: () => Promise<ILot>
  markAsSold: (date: string) => Promise<ILot>
  getMediaArray: (mediaType: MediaType) => Types.DocumentArray<THydratedLotMediaData>
  getMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType) => THydratedLotMediaData | null
  getMediaOrThrow: ( mediaId: string | Types.ObjectId, mediaType: MediaType) => THydratedLotMediaData
  addMedia: ( media: ILotMediaData, mediaType: MediaType, options?: MediaSaveOptions) => Promise<{ lot: ILot, media: ILotMediaData }>
  removeMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, options?: MediaSaveOptions) => ILot | Promise<ILot>
  setPrimaryMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, options?: MediaSaveOptions ) => ILot | Promise<ILot>
  finishProcessingMedia: ( mediaId: string | Types.ObjectId, mediaType: MediaType, s3Location: string, options?: MediaSaveOptions) => Promise<{ lot: ILot, media: ILotMediaData | null }>
}

export type LotModelType = Model<ILot, object, ILotMethods>

/*************************************************
 * Schema
 * ======
 *
 ********/

// define the schema for our lot model
export const lotSchema = new Schema<ILot, LotModelType, ILotMethods>(

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

    images: [ lotMediaDataSchema ],
    videos: [ lotMediaDataSchema ],

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

    isDeleted: Boolean,

  },

  {
    collection: 'lots',
    timestamps: true,
    strict: true,

    methods: {
      setPackagingTypeFromShippingItems,

      edit: function( data: Partial<ILot> ) {

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

        return this[ mediaType ] as Types.DocumentArray<THydratedLotMediaData>
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

      addMedia: async function( media: ILotMediaData, mediaType: MediaType, { save } = { save: true } ) {

        const arr = this.getMediaArray( mediaType )
        arr.push( Object.assign( media, { _id: new Types.ObjectId() } ) )

        if( save ) {
          await this.save()
        }

        return { lot: this, media }

      },

      removeMedia: function( mediaId: string | Types.ObjectId, mediaType: MediaType, { save } = { save: true } ): ILot | Promise<ILot> {

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

  if( typeof this.isDeleted !== 'boolean' ) {
    this.isDeleted = false
  }

  if( !this.priceValuePercentage || this.priceValuePercentage < 0 ) {
    this.priceValuePercentage = __DEFAULT_PRICE_VALUE_PCT__
  }

} )

