jest.mock('http', () => {
    const actualModule = jest.requireActual('http')

    return {
        ...actualModule,
        createServer: jest.fn(),
    }
})
const makeRequestMock = jest.fn()

jest.mock('../../../src/utils/index', () => ({
    makeRequest: makeRequestMock,
    validateTotalRequestsLabels: jest.fn(),
}))

import * as http from 'http'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { mockInstance } from '@diia-inhouse/test'

const clientRegisterMock = {
    Counter: jest.fn(),
    Histogram: jest.fn(),
    register: {
        metrics: jest.fn(),
        getSingleMetric: jest.fn(),
    },
}

jest.mock('prom-client', () => clientRegisterMock)

import { MetricsService } from '../../../src'

describe('MetricsService', () => {
    const loggerMock: DiiaLogger = mockInstance(DiiaLogger)
    const defaultMetricsConfig = {
        disableDefaultMetrics: true,
        disabled: true,
        moleculer: {
            host: 'example.com',
            port: 3000,
            path: '/metrics',
            disabled: false,
        },
    }

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('method: startServer', () => {
        it('should start server', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, false)
            const metrics = 'metrics'
            const endMock = jest.fn()

            clientRegisterMock.register.metrics.mockReturnValueOnce(metrics)
            ;(<jest.Mock>http.createServer).mockImplementationOnce((callbackServer: (req: object, res: object) => void) => {
                callbackServer(
                    {},
                    {
                        statusCode: undefined,
                        end: endMock,
                    },
                )

                return {
                    listen: jest.fn().mockImplementationOnce((_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
        })

        it('should handle server errors and log them', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, false)
            const serverError = new Error('Server error')

            clientRegisterMock.register.metrics.mockImplementationOnce(() => {
                throw serverError
            })
            ;(<jest.Mock>http.createServer).mockImplementationOnce((callbackServer) => {
                callbackServer(
                    {},
                    {
                        statusCode: undefined,
                        end: jest.fn(),
                    },
                )

                return {
                    listen: jest.fn().mockImplementationOnce((_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            expect(loggerMock.error).toHaveBeenCalledWith('Metrics request failed', {
                err: expect.any(Error),
            })
        })

        it('should get metrics from moleculer', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, true)
            const metrics = ''
            const endMock = jest.fn()

            clientRegisterMock.register.metrics.mockReturnValueOnce(metrics)
            ;(<jest.Mock>http.createServer).mockImplementationOnce((callbackServer) => {
                callbackServer(
                    {},
                    {
                        statusCode: undefined,
                        end: endMock,
                    },
                )

                return {
                    listen: jest.fn().mockImplementationOnce(async (_port, callback) => callback()),
                }
            })

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
            expect(makeRequestMock).toHaveBeenCalled()
        })

        it('should catch error taken from moleculer', async () => {
            const metricsService: MetricsService = new MetricsService(loggerMock, defaultMetricsConfig, true)
            const metrics = ''
            const endMock = jest.fn()

            clientRegisterMock.register.metrics.mockReturnValueOnce(metrics)
            ;(<jest.Mock>http.createServer).mockImplementationOnce((callbackServer) => {
                callbackServer(
                    {},
                    {
                        statusCode: undefined,
                        end: endMock,
                    },
                )

                return {
                    listen: jest.fn().mockImplementationOnce(async (_port, callback) => callback()),
                }
            })
            const err = new Error('error')

            makeRequestMock.mockRejectedValueOnce(err)

            await expect(metricsService.startServer()).resolves.toBeUndefined()

            expect(endMock).toHaveBeenCalledWith(expect.any(Buffer))
            expect(loggerMock.error).toHaveBeenCalledWith('Failed to get moleculer metrics', { err })
        })
    })

    describe('method: onInit', () => {
        it('shouldn`t call createServer when metrics is enabled', async () => {
            const metricsConfig = Object.assign({}, defaultMetricsConfig)
            const metricsService: MetricsService = new MetricsService(loggerMock, metricsConfig, false)

            await metricsService.onInit()

            expect(<jest.Mock>http.createServer).not.toHaveBeenCalled()
        })

        it('shouldn`t call createServer when metrics is disabled', async () => {
            const metricsConfig = Object.assign({}, defaultMetricsConfig, {
                disabled: false,
            })

            const listenFn = jest.fn().mockImplementation((_port, callback) => {
                callback()
            })

            ;(<jest.Mock>http.createServer).mockReturnValueOnce({
                listen: listenFn,
            })

            const metricsService: MetricsService = new MetricsService(loggerMock, metricsConfig, false)

            await metricsService.onInit()

            expect(<jest.Mock>http.createServer).toHaveBeenCalled()

            expect(listenFn).toHaveBeenCalled()
        })
    })
})
