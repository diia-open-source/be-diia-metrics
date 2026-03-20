import * as http from 'node:http'

import * as client from 'prom-client'

import { DurationMs, HttpStatusCode, Logger, OnDestroy, OnInit } from '@diia-inhouse/types'

import {
    CustomLabelsValidate,
    KeysOfUnion,
    LabelsType,
    MetricOptions,
    MetricsConfig,
    ScraperOptions,
    TotalRequestsLabelsMap,
    requestHistogramDefaultBuckets,
    responseHistogramDefaultBuckets,
    totalRequestsAllowedFields,
} from '../interfaces/index'
import { makeRequest, validateTotalRequestsLabels } from '../utils/index'
import { eventLoopUtilizationObserver } from './eventLoopUtilizationObserver'
import { Observer } from './observer'

export class Histogram<M extends LabelsType<M>> {
    private readonly promHistogram: client.Histogram

    constructor(
        name: string,
        labelNames: Extract<KeysOfUnion<M>, string>[] = [],
        help?: string,
        buckets?: number[],
        private readonly customLabelsValidate?: CustomLabelsValidate<M>,
    ) {
        const existedMetric = client.register.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Histogram) {
            this.promHistogram = existedMetric

            return
        }

        this.promHistogram = new client.Histogram({
            name,
            labelNames,
            buckets: buckets,
            help: help || name,
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

        this.promHistogram.observe(labels, value)
    }

    /**
     * Records the duration of an operation in seconds.
     *
     * @param {Partial<M>} rawLabels - An object containing the labels for the metric.
     * @param {bigint} ts - The time duration (delta) in nanoseconds.
     * Expected to be the result of `end - start` using `process.hrtime.bigint()`.
     *
     * @example
     * const start = process.hrtime.bigint();
     * // ... perform operation ...
     * const delta = process.hrtime.bigint() - start;
     * metrics.observeSeconds({ status: 'successful', mechanism: 'rabbitmq' }, delta);
     *
     * @returns {void}
     */
    observeSeconds(rawLabels: Partial<M>, ts: bigint): void {
        const labels = this.validateLabels(rawLabels)
        const seconds = Number(ts / 1_000_000n) / 1000

        this.promHistogram.observe(labels, Number(seconds))
    }

    recordTimer(rawLabels: Partial<M>): (labels?: Partial<M>) => number {
        const labels = this.validateLabels(rawLabels)

        return this.promHistogram.startTimer(labels)
    }
}

export class Counter<M extends LabelsType<M>> {
    private readonly promCounter: client.Counter

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
        if (existedMetric && existedMetric instanceof client.Counter) {
            this.promCounter = existedMetric

            return
        }

        const validateLabels = this.validateLabels.bind(this)

        this.promCounter = new client.Counter({
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

                    this.inc(labels, value)
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

    increment(rawLabels: Partial<M>, value?: number): void {
        const labels = this.validateLabels(rawLabels)

        this.promCounter.inc(labels, value)
    }
}

export class Timer<M extends LabelsType<M>> {
    private readonly promTimer: client.Gauge

    constructor(
        name: string,
        labelNames: Extract<KeysOfUnion<M>, string>[] = [],
        help?: string,
        private readonly customLabelsValidate?: CustomLabelsValidate<M>,
    ) {
        const existedMetric = client.register.getSingleMetric(name)
        if (existedMetric && existedMetric instanceof client.Gauge) {
            this.promTimer = existedMetric

            return
        }

        this.promTimer = new client.Gauge({
            name,
            labelNames,
            help: help || name,
        })
    }

    validateLabels(rawLabels: Partial<M>): Partial<M> {
        if (this.customLabelsValidate) {
            return this.customLabelsValidate(rawLabels)
        }

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

export class MetricsService implements OnInit, OnDestroy {
    pushGatewayRegistry = new client.Registry()

    totalRequestMetric = new Counter<TotalRequestsLabelsMap>('requests_total', totalRequestsAllowedFields, 'Total requests made by service')

    totalTimerMetric: Histogram<TotalRequestsLabelsMap>

    responseTotalTimerMetric: Histogram<TotalRequestsLabelsMap>

    eventLoopUtilizationMetric: Observer<{}>

    private registry = client.register

    private server?: http.Server

    private pushGateway?: client.Pushgateway<client.PrometheusContentType>

    constructor(
        private readonly logger: Logger,
        private readonly metricsConfig: MetricsConfig,
        private readonly systemServiceName: string,
    ) {
        if (this.metricsConfig.pushGateway.isEnabled) {
            this.pushGateway = new client.Pushgateway(this.metricsConfig.pushGateway.url, undefined, this.pushGatewayRegistry)
        }

        if (this.metricsConfig.disableDefaultMetrics) {
            this.totalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
                'dummy',
                totalRequestsAllowedFields,
                'Dummy',
                [],
                validateTotalRequestsLabels,
            )
            this.responseTotalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
                'dummy1',
                totalRequestsAllowedFields,
                'Dummy1',
                [],
                validateTotalRequestsLabels,
            )
            this.eventLoopUtilizationMetric = new Observer<{}>('dummy_event_loop_utilization', undefined, 'Dummy', {})

            return
        }

        client.register.setDefaultLabels(this.metricsConfig.defaultLabels || {})
        client.collectDefaultMetrics({ labels: this.metricsConfig.defaultLabels })

        this.totalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
            'request_latency_seconds',
            totalRequestsAllowedFields,
            'Request latency in seconds',
            this.metricsConfig.requestTimingBuckets || requestHistogramDefaultBuckets,
            validateTotalRequestsLabels,
        )
        this.responseTotalTimerMetric = new Histogram<TotalRequestsLabelsMap>(
            'response_latency_seconds',
            totalRequestsAllowedFields,
            'Response latency in seconds',
            this.metricsConfig.responseTimingBuckets || responseHistogramDefaultBuckets,
            validateTotalRequestsLabels,
        )
        this.eventLoopUtilizationMetric = eventLoopUtilizationObserver()
    }

    async onInit(): Promise<void> {
        if (this.metricsConfig.disabled) {
            return
        }

        await this.startServer()
        if (this.pushGateway) {
            setInterval(
                async () => {
                    try {
                        await this.push()
                    } catch (err) {
                        this.logger.error('Failed to push metrics', { err })
                    }
                },
                this.metricsConfig.pushGateway.intervalMs ?? DurationMs.Second * 30,
            )
        }
    }

    async onDestroy(): Promise<void> {
        await this.push()

        return await new Promise((resolve, reject) => {
            if (!this.server) {
                return resolve()
            }

            this.server.close((err) => (err ? reject(err) : resolve()))
        })
    }

    async startServer(): Promise<void> {
        this.server = http.createServer(async (_req, res) => {
            try {
                let metrics = await this.registry.metrics()

                res.setHeader('Content-Type', this.registry.contentType)

                if (this.metricsConfig.scrapers) {
                    const enabledScrapers = this.metricsConfig.scrapers.filter((scraper) => !scraper.disabled)
                    const scraperResults = await Promise.all(enabledScrapers.map((scraper) => this.pollService(scraper)))

                    metrics += scraperResults.join('')
                }

                res.end(Buffer.from(metrics, 'utf8'))
            } catch (err) {
                this.logger.error('Metrics request failed', { err })
                res.statusCode = HttpStatusCode.SERVICE_UNAVAILABLE
                res.end('Request failed')
            }
        })

        return await new Promise((resolve: () => void) => {
            this.server!.listen(this.metricsConfig.port ?? 3030, () => {
                resolve()
            })
        })
    }

    private async push(): Promise<void> {
        if (!this.pushGateway) {
            return
        }

        await this.pushGateway.push({ jobName: 'pods', groupings: { app: this.systemServiceName } })
    }

    private async pollService(scraper: ScraperOptions): Promise<string> {
        let response = ''
        try {
            response = await makeRequest(`http://${scraper.host ?? '127.0.0.1'}:${scraper.port}${scraper.path ?? '/metrics'}`)
        } catch (err) {
            this.logger.error(`Failed to get ${scraper.name} metrics`, { err })
        }

        return response
    }
}
