import * as http from 'node:http'

import { register } from 'prom-client'
import { Mock } from 'vitest'
import { mock } from 'vitest-mock-extended'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { ErrorType } from '@diia-inhouse/errors'
import { DurationMs, HttpStatusCode } from '@diia-inhouse/types'

import { MetricsConfig, MetricsService, RequestMechanism, RequestStatus, TotalRequestsLabelsMap } from '../../../src'
import { makeRequest } from '../../../src/utils/index'

vi.mock('node:http', () => {
    const actualModule = vi.importActual('node:http')

    return {
        ...actualModule,
        createServer: vi.fn(),
    }
})

const promContentType = 'text/plain; version=0.0.4; charset=utf-8'

vi.mock('../../../src/utils/index', async (importOriginal) => {
    const actual = await importOriginal()

    return {
        ...(actual as object),
        makeRequest: vi.fn(),
    }
})

const makeRequestMock = vi.mocked(makeRequest)

vi.mock('prom-client', () => ({
    Counter: vi.fn(),
    Histogram: vi.fn(),
    register: {
        metrics: vi.fn(),
        getSingleMetric: vi.fn(),
        contentType: 'text/plain; version=0.0.4; charset=utf-8',
    },
    Registry: vi.fn(),
    Pushgateway: vi.fn(),
}))

describe('MetricsService', () => {
    const loggerMock = mock<DiiaLogger>()
    const defaultMetricsConfig: MetricsConfig = {
        disableDefaultMetrics: true,
        disabled: true,
        scrapers: [
            {
                name: 'moleculer',
                host: 'example.com',
                port: 3000,
                path: '/metrics',
                disabled: false,
            },
        ],
        pushGateway: {
            isEnabled: true,
            url: 'http://localhost:9091',
            intervalMs: DurationMs.Second * 60,
        },
    }

    afterEach(() => {
        vi.resetAllMocks()
    })

    describe('method: startServer', () => {
        it('should start server', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, 'systemServiceName')
            const metrics = 'metrics'
            const headerMock = vi.fn()
            const endMock = vi.fn()

            vi.mocked(register.metrics).mockResolvedValueOnce(metrics)
            ;(http.createServer as Mock).mockImplementationOnce((requestCallback) => {
                setTimeout(() => {
                    requestCallback(
                        { url: '/metrics' },
                        {
                            statusCode: undefined,
                            setHeader: headerMock,
                            end: endMock,
                        },
                    )
                }, 0)

                return {
                    listen: vi.fn().mockImplementationOnce(async (_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            await new Promise((resolve) => setTimeout(resolve, 10))

            expect(headerMock).toHaveBeenCalledWith('Content-Type', promContentType)
            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
        })

        it('should handle server errors and log them', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, 'systemServiceName')
            const serverError = new Error('Server error')

            vi.mocked(register.metrics).mockImplementationOnce(() => {
                throw serverError
            })
            ;(http.createServer as Mock).mockImplementationOnce((callbackServer) => {
                callbackServer(
                    {},
                    {
                        statusCode: undefined,
                        setHeader: vi.fn(),
                        end: vi.fn(),
                    },
                )

                return {
                    listen: vi.fn().mockImplementationOnce((_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            expect(loggerMock.error).toHaveBeenCalledWith('Metrics request failed', {
                err: expect.any(Error),
            })
        })

        it('should get metrics from moleculer', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, 'systemServiceName')
            const metrics = ''
            const headerMock = vi.fn()
            const endMock = vi.fn()

            vi.mocked(register.metrics).mockResolvedValueOnce(metrics)
            ;(http.createServer as Mock).mockImplementationOnce((requestCallback) => {
                setTimeout(() => {
                    requestCallback(
                        {},
                        {
                            statusCode: undefined,
                            setHeader: headerMock,
                            end: endMock,
                        },
                    )
                }, 0)

                return {
                    listen: vi.fn().mockImplementationOnce(async (_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            await new Promise((resolve) => setTimeout(resolve, 10))

            expect(headerMock).toHaveBeenCalledWith('Content-Type', promContentType)
            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
            expect(makeRequestMock).toHaveBeenCalled()
        })

        it('should catch error taken from moleculer', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, 'systemServiceName')
            const metrics = ''
            const headerMock = vi.fn()
            const endMock = vi.fn()

            vi.mocked(register.metrics).mockResolvedValueOnce(metrics)
            ;(http.createServer as Mock).mockImplementationOnce((requestCallback) => {
                setTimeout(() => {
                    requestCallback(
                        {},
                        {
                            statusCode: undefined,
                            setHeader: headerMock,
                            end: endMock,
                        },
                    )
                }, 0)

                return {
                    listen: vi.fn().mockImplementationOnce(async (_port, callback) => callback()),
                }
            })
            const err = new Error('error')

            makeRequestMock.mockRejectedValueOnce(err)

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            await new Promise((resolve) => setTimeout(resolve, 10))

            expect(headerMock).toHaveBeenCalledWith('Content-Type', promContentType)
            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
            expect(loggerMock.error).toHaveBeenCalledWith('Failed to get moleculer metrics', { err })
        })
    })

    describe('method: onInit', () => {
        it('shouldn`t call createServer when metrics is enabled', async () => {
            const metricsConfig = Object.assign({}, defaultMetricsConfig)
            const metricsService: MetricsService = new MetricsService(loggerMock, metricsConfig, 'systemServiceName')

            await metricsService.onInit()

            expect(http.createServer as Mock).not.toHaveBeenCalled()
        })

        it('shouldn`t call createServer when metrics is disabled', async () => {
            const metricsConfig = Object.assign({}, defaultMetricsConfig, {
                disabled: false,
            })

            const listenFn = vi.fn().mockImplementation((_port, callback) => {
                callback()
            })

            ;(http.createServer as Mock).mockReturnValueOnce({
                listen: listenFn,
            })

            const metricsService: MetricsService = new MetricsService(loggerMock, metricsConfig, 'systemServiceName')

            await metricsService.onInit()

            expect(http.createServer as Mock).toHaveBeenCalled()

            expect(listenFn).toHaveBeenCalled()
        })
    })
    describe(`property: totalTimerMetric`, () => {
        it('should validate labels', async () => {
            // Arrange
            const metricsConfig: MetricsConfig = { ...defaultMetricsConfig }
            const metricsService: MetricsService = new MetricsService(loggerMock, metricsConfig, 'systemServiceName')

            await metricsService.onInit()

            const labels: TotalRequestsLabelsMap = {
                route: '/route',
                source: 'Source',
                destination: 'Destination',
                statusCode: HttpStatusCode.OK,
                status: RequestStatus.Successful,
                mechanism: RequestMechanism.Moleculer,
                errorType: 'REQUEST_REJECTED' as ErrorType,
            }

            // Act
            const result = metricsService.totalTimerMetric.validateLabels(labels)

            // Assert
            expect(result).toEqual<TotalRequestsLabelsMap>({
                ...labels,
                errorType: ErrorType.Unoperated,
            })
        })
    })
})
