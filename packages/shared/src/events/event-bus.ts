import mitt from 'mitt'
import type { EventMap } from './event-types'

export const eventBus = mitt<EventMap>()
