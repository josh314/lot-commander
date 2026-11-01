import type { z } from 'zod'

import { client, server } from '../schemas'

export type CounterHandle = 'pallet-lots'

export type IncrementRequest = z.infer<typeof server.api.counters.IncrementRequestSchema>

export type InitializeRequest = z.infer<typeof server.api.counters.InitializeRequestSchema>

export type Data = z.infer<typeof client.api.counters.DataSchema>
export type Response = z.infer<typeof client.api.counters.ResponseSchema>