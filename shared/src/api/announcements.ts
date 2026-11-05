import * as z from 'zod/v4'

import { RequestListQueryParamsSchema } from './utils'

const RequestFilterQueryParamsSchema = z.object({
  isActive: z.boolean().optional()
});

export const CountRequestQueryParamsSchema = RequestFilterQueryParamsSchema

export const ListRequestQueryParamsSchema = RequestFilterQueryParamsSchema.extend(RequestListQueryParamsSchema.shape)

export const CreateRequestBodySchema = z.object({
  header: z.string(),
  body: z.string(),
  isActive: z.boolean(),
})

export const EditRequestBodySchema = CreateRequestBodySchema.partial()

export const CountResponseSchema = z.object({
  count: z.number(),
})

export const DTOSchema = z.object({
  _id: z.string(),
  header: z.string(),
  body: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ListResponseSchema = z.object({
  announcements: z.array( DTOSchema )
})

export const GetResponseSchema = z.object({
  announcement: DTOSchema
})


export type CountRequestQueryParams = z.infer<typeof CountRequestQueryParamsSchema>
export type ListRequestQueryParams = z.infer<typeof ListRequestQueryParamsSchema>
export type CreateRequestBody = z.infer<typeof CreateRequestBodySchema>
export type EditRequestBody = z.infer<typeof EditRequestBodySchema>

export type CountResponse = z.infer<typeof CountResponseSchema>
export type DTO = z.infer<typeof DTOSchema>
export type ListResponse = z.infer<typeof ListResponseSchema>
export type GetResponse = z.infer<typeof GetResponseSchema>
export type CreateResponse = GetResponse
export type EditResponse = GetResponse

