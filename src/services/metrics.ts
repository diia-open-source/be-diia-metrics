import http from 'http'

import client from 'prom-client'

import { HttpStatusCode, Logger, OnInit } from '@diia-inhouse/types'

import {
    MetricsConfig,
    TotalRequestsLabelsMap,
    requestHistogramDefaultBuckets,
    responseHistogramDefaultBuckets,
    totalRequestsAllowedFields,
} from '../interfaces/index'
import { makeRequest, validateTotalRequestsLabels } from '../utils/index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Histogram<M extends Record<string, any>> {
    private readonly promHistogram: client.Histogram

    constructor(name: string, labelNames: Extract<keyof M, string>[] = [], help?: string, buckets?: number[]) {
        const existedMetric = client.register.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Histogram) {
            this.promHistogram = existedMetric

            return
        }

        this.promHistogram = new client.Histogram({
            name,
            labelNames,
            buckets: buckets,
            help: help ? help : name,
        })
    }

    validateLabels(rawLabels: Partial<M>): Partial<M> {
        return rawLabels
    }

    observe(rawLabels: Partial<M>, value: number): void {
        const labels = this.validateLabels(rawLabels)

        this.promHistogram.observe(labels, value)
    }

    observeSeconds(rawLabels: Partial<M>, ts: bigint): void {
        const labels = this.validateLabels(rawLabels)
        const secondsFromNanoseconds = ts / BigInt(Math.pow(10, 9))

        this.promHistogram.observe(labels, Number(secondsFromNanoseconds))
    }

    recordTimer(rawLabels: Partial<M>): (labels?: Partial<M>) => number {
        const labels = this.validateLabels(rawLabels)

        return this.promHistogram.startTimer(labels)
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Counter<M extends Record<string, any>> {
    private readonly promCounter: client.Counter

    constructor(name: string, labelNames: Extract<keyof M, string>[] = [], help?: string) {
        const existedMetric = client.register.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Counter) {
            this.promCounter = existedMetric

            return
        }

        this.promCounter = new client.Counter({
            name,
            labelNames,
            help: help ? help : name,
        })
    }

    validateLabels(rawLabels: Partial<M>): Partial<M> {
        return rawLabels
    }

    increment(rawLabels: Partial<M>, value?: number): void {
        const labels = this.validateLabels(rawLabels)

        this.promCounter.inc(labels, value)
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Timer<M extends Record<string, any>> {
    private readonly promTimer: client.Gauge

    constructor(name: string, labelNames: Extract<keyof M, string>[] = [], help?: string) {
        const existedMetric = client.register.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Gauge) {
            this.promTimer = existedMetric

            return
        }

        this.promTimer = new client.Gauge({
            name,
            labelNames,
            help: help ? help : name,
        })
    }

    validateLabels(rawLabels: Partial<M>): Partial<M> {
        return rawLabels
    }

    /**
     * @param ts accepts result of hrtime.bigint diff operation
     */
    setTimer(rawLabels: Partial<M>, ts: bigint): void {
        const labels = this.validateLabels(rawLabels)
        const secondsFromNanoseconds = ts / BigInt(Math.pow(10, 9))

        this.promTimer.set(labels, Number(secondsFromNanoseconds))
    }
}

export class MetricsService implements OnInit {
    private registry = client.register

    totalRequestMetric = new Counter<TotalRequestsLabelsMap>('requests_total', totalRequestsAllowedFields, 'Total requests made by service')

    totalTimerMetric: Histogram<TotalRequestsLabelsMap>

    responseTotalTimerMetric: Histogram<TotalRequestsLabelsMap>

    constructor(
        private readonly logger: Logger,
        private readonly metricsConfig: MetricsConfig,
        private readonly isMoleculerEnabled = false,
    ) {
        if (this.metricsConfig.disableDefaultMetrics) {
            this.totalTimerMetric = new Histogram<TotalRequestsLabelsMap>('dummy')
            this.responseTotalTimerMetric = new Histogram<TotalRequestsLabelsMap>('dummy1')

            return
        }

        client.register.setDefaultLabels(this.metricsConfig.defaultLabels || {})
        client.collectDefaultMetrics({ labels: this.metricsConfig.defaultLabels })

        this.totalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
            'request_latency_seconds',
            totalRequestsAllowedFields,
            'Request latency in seconds',
            this.metricsConfig.requestTimingBuckets || requestHistogramDefaultBuckets,
        )
        this.responseTotalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
            'response_latency_seconds',
            totalRequestsAllowedFields,
            'Response latency in seconds',
            this.metricsConfig.responseTimingBuckets || responseHistogramDefaultBuckets,
        )
        this.totalRequestMetric.validateLabels = validateTotalRequestsLabels
        this.responseTotalTimerMetric.validateLabels = validateTotalRequestsLabels
        this.totalTimerMetric.validateLabels = validateTotalRequestsLabels
    }

    async onInit(): Promise<void> {
        if (this.metricsConfig.disabled) {
            return
        }

        await this.startServer()
    }

    async startServer(): Promise<void> {
        const server = http.createServer(async (_req, res) => {
            try {
                let metrics = await this.registry.metrics()

                if (this.isMoleculerEnabled && !this.metricsConfig.moleculer?.disabled) {
                    metrics += await this.pollMoleculer()
                }

                res.end(Buffer.from(metrics, 'utf8'))
            } catch (err) {
                this.logger.error('Metrics request failed', { err })
                res.statusCode = HttpStatusCode.SERVICE_UNAVAILABLE
                res.end('Request failed')
            }
        })

        return await new Promise((resolve: () => void) => {
            server.listen(this.metricsConfig.port ?? 3030, () => {
                resolve()
            })
        })
    }

    private async pollMoleculer(): Promise<string> {
        let response = ''
        try {
            const { moleculer } = this.metricsConfig

            response = await makeRequest(
                `http://${moleculer?.host ?? '127.0.0.1'}:${moleculer?.port ?? 3031}${moleculer?.path ?? '/metrics'}`,
            )
        } catch (err) {
            this.logger.error('Failed to get moleculer metrics', { err })
        }

        return response
    }
}
