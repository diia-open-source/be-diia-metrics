/* eslint-disable unicorn/no-useless-undefined */
import * as client from 'prom-client'

import { ErrorType } from '@diia-inhouse/errors'

import { TotalRequestsLabelsMap } from '@src/interfaces'

import { customErrorTypeValidate } from '@tests/utils/customLabelsValidate'

import { Histogram } from '../../../src/services'

vi.mock('prom-client', () => ({
    register: {
        getSingleMetric: vi.fn(),
    },
    Histogram: vi.fn(),
}))

describe('Histogram', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should return labels', () => {
        const histogram = new Histogram('testHistogram')
        const expectedLabels = { label1: 'value1', label2: 2 }

        expect(histogram.validateLabels(expectedLabels)).toEqual(expectedLabels)
    })
    it('should return labels if customLabelsValidate is specified', () => {
        // Arrange
        const histogram = new Histogram('testHistogram', [], '', [], customErrorTypeValidate)
        const labels = { label1: 'value1', label2: 2, errorType: 'REQUEST_REJECTED' } as unknown as TotalRequestsLabelsMap

        // Act
        const result = histogram.validateLabels(labels)

        // Assert
        expect(result).toEqual({ ...labels, errorType: ErrorType.Unoperated })
    })

    it('should call observe', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = { label3: 'value3', label4: 4 }
        const val = 100

        existingHistogram.observe = vi.fn()
        const histogram = new Histogram('testHistogram')

        histogram.observe(labels, val)

        expect(existingHistogram.observe).toHaveBeenCalledWith(labels, val)
    })

    it('should call observeSeconds', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = { label3: 'value3', label4: 4 }
        const val = 10000000n

        existingHistogram.observe = vi.fn()
        const histogram = new Histogram('testHistogram')

        histogram.observeSeconds(labels, val)

        expect(existingHistogram.observe).toHaveBeenCalledWith(labels, 0.01)
    })

    it('should call recordTimer', () => {
        const existingHistogram = new client.Histogram({ name: 'testHistogram', help: 'help', collect: undefined })

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)
        const labels = { label3: 'value3', label4: 4 }

        existingHistogram.startTimer = vi.fn()
        const histogram = new Histogram('testHistogram')

        histogram.recordTimer(labels)

        expect(existingHistogram.startTimer).toHaveBeenCalledWith(labels)
    })

    it('should reuse existing histogram if it exists', () => {
        const props = { name: 'name', help: 'help' }
        const existingHistogram = new client.Histogram(props)

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingHistogram)

        new Histogram('testHistogram')

        expect(client.Histogram).toHaveBeenCalledWith(props)
    })

    it('should create a new histogram if it does not exist', () => {
        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Histogram('testHistogram')

        expect(client.Histogram).toHaveBeenCalledWith({
            name: 'testHistogram',
            labelNames: [],
            help: 'testHistogram',
        })
    })

    it('should create a new histogram with custom label names, help message, and buckets', () => {
        const buckets = [0.1, 0.5, 1, 2.5, 5]

        vi.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Histogram('customHistogram', ['label1', 'label2'], 'Custom help message', buckets)

        expect(client.Histogram).toHaveBeenCalledWith({
            name: 'customHistogram',
            labelNames: ['label1', 'label2'],
            help: 'Custom help message',
            buckets: buckets,
        })
    })
})
