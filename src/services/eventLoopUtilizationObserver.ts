import { performance } from 'node:perf_hooks'

import type { MetricOptions } from '../interfaces/index'
import { Observer } from './observer'

const EVENT_LOOP_UTILIZATION_METRIC_NAME = 'diia_node_event_loop_utilization_ratio'
const EVENT_LOOP_UTILIZATION_HELP = 'Indicates the event loop utilization ratio'

export function eventLoopUtilizationObserver(): Observer<{}> {
    let previousEventLoopUtilization: ReturnType<typeof performance.eventLoopUtilization> | undefined

    return new Observer<{}>(EVENT_LOOP_UTILIZATION_METRIC_NAME, undefined, EVENT_LOOP_UTILIZATION_HELP, {
        onCollect: (): ReturnType<Required<MetricOptions<{}>>['onCollect']> => {
            const currentUtilization = performance.eventLoopUtilization()

            if (previousEventLoopUtilization === undefined) {
                previousEventLoopUtilization = currentUtilization

                return { labels: {}, value: 0 }
            }

            const deltaUtilization = performance.eventLoopUtilization(previousEventLoopUtilization)

            previousEventLoopUtilization = currentUtilization

            return { labels: {}, value: deltaUtilization.utilization }
        },
    })
}
