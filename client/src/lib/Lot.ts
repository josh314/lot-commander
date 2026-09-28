import * as schemas from "../schemas"

export type LotData = schemas.api.lots.Data
export type LotStatus = schemas.api.lots.Status

export class Lot {

  id: string
  handle: string
  totalUnits?: number
  createdAt?: Date
  updatedAt?: Date
  status?: LotStatus

  constructor( data: LotData ) {
    this.id = data._id
    this.handle = data.handle
    this.totalUnits = data.totalUnits
    this.createdAt = data.createdAt ? new Date(data.createdAt) : undefined
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined
    this.status = data.status
  }

}