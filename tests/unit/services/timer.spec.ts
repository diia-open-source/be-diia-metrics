/* eslint-disable unicorn/no-useless-undefined */
import * as client from 'prom-client'

import { Timer } from '../../../src/services'

jest.mock('prom-client', () => ({
    register: {
        getSingleMetric: jest.fn(),
    },
    Gauge: jest.fn(),
}))

describe('Timer', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should store setTimer', async () => {
        const metric = new client.Gauge({
            name: 'name',
            labelNames: [],
            help: 'help',
        })

        metric.set = jest.fn()

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(metric)

        const timer = new Timer('testMetric')
        const labels = ['label3', 'label4']

        timer.setTimer(labels, BigInt(10))

        expect(metric.set).toHaveBeenCalledWith(labels, expect.any(Number))
    })

    it('should create a new metric if it does not exist', () => {
        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Timer('testMetric')

        expect(client.Gauge).toHaveBeenCalledWith({
            name: 'testMetric',
            labelNames: [],
            help: 'testMetric',
        })
    })

    it('should create a new metric with custom label names and help message', () => {
        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Timer('customMetric', ['label1', 'label2'], 'Custom help message')

        expect(client.Gauge).toHaveBeenCalledWith({
            name: 'customMetric',
            labelNames: ['label1', 'label2'],
            help: 'Custom help message',
        })
    })

    it('should return labels', () => {
        const timer = new Timer('testMetric')
        const expectedLabels = ['label1', 'label2']

        expect(timer.validateLabels(expectedLabels)).toEqual(expectedLabels)
    })
})
