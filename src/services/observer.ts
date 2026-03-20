import * as client from 'prom-client'

import { CustomLabelsValidate, KeysOfUnion, LabelsType, MetricOptions } from '../interfaces/index'

export class Observer<M extends LabelsType<M>> {
    private readonly promObserver: client.Gauge

    constructor(
        name: string,
        labelNames: Extract<KeysOfUnion<M>, string>[] = [],
        help?: string,
        options?: MetricOptions<M>,
        private readonly customLabelsValidate?: CustomLabelsValidate<M>,
    ) {
        const { onCollect, registry: customRegistry } = options || {}
        const registry = customRegistry || client.register
        const existedMetric = registry.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Gauge) {
            this.promObserver = existedMetric

            return
        }

        const validateLabels = this.validateLabels.bind(this)

        this.promObserver = new client.Gauge({
            name,
            labelNames,
            help: help || name,
            ...(customRegistry && {
                registers: [customRegistry],
            }),
            ...(onCollect && {
                collect(): void {
                    const { labels: rawLabels, value } = onCollect()
                    const labels = validateLabels(rawLabels)

                    this.set(labels, value)
                },
            }),
        })
    }

    validateLabels(rawLabels: Partial<M>): Partial<M> {
        if (this.customLabelsValidate) {
            return this.customLabelsValidate(rawLabels)
        }

        return rawLabels
    }

    observe(rawLabels: Partial<M>, value: number): void {
        const labels = this.validateLabels(rawLabels)

        this.promObserver.set(labels, value)
    }
}
