/* eslint-disable unicorn/no-useless-undefined */
import * as client from 'prom-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Timer } from '../../../src/services'

vi.mock('prom-client', () => ({
    register: {
        getSingleMetric: vi.fn(),
    },
    Gauge: vi.fn(),
}))

describe('Timer', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should store setTimer', async () => {
        const metric = new client.Gauge({
            name: 'name',
            labelNames: [],
            help: 'help',
        })

        metric.set = vi.fn()

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(metric)

        const timer = new Timer('testMetric')
        const labels = { label3: 'value3', label4: 4 }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        timer.setTimer(labels, 10n)

        expect(metric.set).toHaveBeenCalledWith(labels, expect.any(Number))
    })

    it('should create a new metric if it does not exist', () => {
        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Timer('testMetric')

        expect(client.Gauge).toHaveBeenCalledWith({
            name: 'testMetric',
            labelNames: [],
            help: 'testMetric',
        })
    })

    it('should create a new metric with custom label names and help message', () => {
        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Timer('customMetric', ['label1', 'label2'], 'Custom help message')

        expect(client.Gauge).toHaveBeenCalledWith({
            name: 'customMetric',
            labelNames: ['label1', 'label2'],
            help: 'Custom help message',
        })
    })

    it('should return labels', () => {
        const timer = new Timer('testMetric')
        const expectedLabels = { label1: 'value1', label2: 2 }

        expect(timer.validateLabels(expectedLabels)).toEqual(expectedLabels)
    })
})
