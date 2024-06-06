/* eslint-disable unicorn/no-useless-undefined */
import * as client from 'prom-client'

import { Histogram } from '../../../src/services'

jest.mock('prom-client', () => ({
    register: {
        getSingleMetric: jest.fn(),
    },
    Histogram: jest.fn(),
}))

describe('Histogram', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should return labels', () => {
        const histogram = new Histogram('testHistogram')
        const expectedLabels = ['label1', 'label2']

        expect(histogram.validateLabels(expectedLabels)).toEqual(expectedLabels)
    })

    it('should call observe', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = ['label3', 'label4']
        const val = 100

        existingHistogram.observe = jest.fn()
        const histogram = new Histogram('testHistogram')

        histogram.observe(labels, val)

        expect(existingHistogram.observe).toHaveBeenCalledWith(labels, val)
    })

    it('should call observeSeconds', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = ['label3', 'label4']
        const val = BigInt(10000)

        existingHistogram.observe = jest.fn()
        const histogram = new Histogram('testHistogram')

        histogram.observeSeconds(labels, val)

        expect(existingHistogram.observe).toHaveBeenCalledWith(labels, expect.any(Number))
    })

    it('should call recordTimer', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = ['label3', 'label4']

        existingHistogram.startTimer = jest.fn()
        const histogram = new Histogram('testHistogram')

        histogram.recordTimer(labels)

        expect(existingHistogram.startTimer).toHaveBeenCalledWith(labels)
    })

    it('should reuse existing histogram if it exists', () => {
        const props = { name: 'name', help: 'help' }
        const existingHistogram = new client.Histogram(props)

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)

        new Histogram('testHistogram')

        expect(client.Histogram).toHaveBeenCalledWith(props)
    })

    it('should create a new histogram if it does not exist', () => {
        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Histogram('testHistogram')

        expect(client.Histogram).toHaveBeenCalledWith({
            name: 'testHistogram',
            labelNames: [],
            help: 'testHistogram',
        })
    })

    it('should create a new histogram with custom label names, help message, and buckets', () => {
        const buckets = [0.1, 0.5, 1, 2.5, 5]

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Histogram('customHistogram', ['label1', 'label2'], 'Custom help message', buckets)

        expect(client.Histogram).toHaveBeenCalledWith({
            name: 'customHistogram',
            labelNames: ['label1', 'label2'],
            help: 'Custom help message',
            buckets: buckets,
        })
    })
})
