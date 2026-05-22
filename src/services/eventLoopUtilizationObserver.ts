import { performance } from 'node:perf_hooks'

import type { MetricOptions } from '../interfaces/index.js'
import { Observer } from './observer.js'

const EVENT_LOOP_UTILIZATION_METRIC_NAME = 'diia_node_event_loop_utilization_ratio'
const EVENT_LOOP_UTILIZATION_HELP = 'Indicates the event loop utilization ratio'

export function eventLoopUtilizationObserver(): Observer<{}> {
    let previousEventLoopUtilization = performance.eventLoopUtilization()
    let isFirstCollect = true

    return new Observer<{}>(EVENT_LOOP_UTILIZATION_METRIC_NAME, undefined, EVENT_LOOP_UTILIZATION_HELP, {
        onCollect: (): ReturnType<Required<MetricOptions<{}>>['onCollect']> => {
            const currentUtilization = performance.eventLoopUtilization()

            if (isFirstCollect) {
                isFirstCollect = false
                previousEventLoopUtilization = currentUtilization

                return { labels: {}, value: 0 }
            }

            const deltaUtilization = performance.eventLoopUtilization(previousEventLoopUtilization)

            previousEventLoopUtilization = currentUtilization

            return { labels: {}, value: deltaUtilization.utilization }
        },
    })
}
