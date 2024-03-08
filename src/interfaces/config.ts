export interface MoleculerScraperOptions {
    disabled?: boolean
    host?: string
    port?: number
    path?: string
}

export interface MetricsConfig {
    disabled?: boolean
    port?: number
    moleculer?: MoleculerScraperOptions
    disableDefaultMetrics?: boolean
    defaultLabels?: Record<string, string>
    requestTimingBuckets?: number[]
    responseTimingBuckets?: number[]
}
