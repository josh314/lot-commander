import type { z } from 'zod'

import { client } from '../schemas'

export type CounterHandle = 'pallet-lots'

export type IncrementCounterRequest = z.infer<typeof client.api.counters.IncrementCounterRequestSchema>

export type CounterResponse = z.infer<typeof client.api.counters.CounterResponseSchema>