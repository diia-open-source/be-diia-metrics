export interface ScraperOptions {
    disabled?: boolean
    name: string
    port: number
    host?: string
    path?: string
}

export interface MetricsConfig {
    disabled?: boolean
    port?: number
    scrapers?: ScraperOptions[]
    disableDefaultMetrics?: boolean
    defaultLabels?: Record<string, string>
    requestTimingBuckets?: number[]
    responseTimingBuckets?: number[]
    pushGateway: {
        isEnabled: boolean
        url: string
        intervalMs?: number
    }
}
