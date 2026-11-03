import { lots } from "@shared/api"

export class Lot {

  id: string
  handle: string
  totalUnits?: number
  createdAt?: Date
  updatedAt?: Date
  status?: lots.Status

  constructor( data: lots.DTO ) {
    this.id = data._id
    this.handle = data.handle
    this.totalUnits = data.totalUnits
    this.createdAt = data.createdAt ? new Date(data.createdAt) : undefined
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined
    this.status = data.status
  }

}