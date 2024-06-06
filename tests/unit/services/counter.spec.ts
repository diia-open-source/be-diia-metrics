/* eslint-disable unicorn/no-useless-undefined */
import * as client from 'prom-client'

import { Counter } from '../../../src/services'

jest.mock('prom-client', () => ({
    register: {
        getSingleMetric: jest.fn(),
    },
    Counter: jest.fn(),
}))

describe('Counter', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should return labels', () => {
        const counter = new Counter('testCounter')
        const expectedLabels = ['label1', 'label2']

        expect(counter.validateLabels(expectedLabels)).toEqual(expectedLabels)
    })

    it('should call increment', () => {
        const existingCounter = new client.Counter({ name: 'testCounter', help: 'help', collect: undefined })

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingCounter)
        existingCounter.inc = jest.fn()

        const counter = new Counter('testCounter')

        const labels = ['label3', 'label4']
        const val = 100

        counter.increment(labels, val)

        expect(existingCounter.inc).toHaveBeenCalledWith(labels, val)
    })

    it('should reuse existing counter if it exists', () => {
        const existingCounter = new client.Counter({ name: 'name', help: 'help', collect: undefined })

        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(existingCounter)

        new Counter('testCounter')

        expect(client.Counter).not.toHaveBeenCalledWith({
            name: 'testCounter',
            labelNames: [],
            help: 'testCounter',
        })
    })

    it('should create a new counter if it does not exist', () => {
        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Counter('testCounter')

        expect(client.Counter).toHaveBeenCalledWith({
            name: 'testCounter',
            labelNames: [],
            help: 'testCounter',
        })
    })

    it('should create a new counter with custom label names and help message', () => {
        jest.spyOn(client.register, 'getSingleMetric').mockReturnValue(undefined)

        new Counter('customCounter', ['label1', 'label2'], 'Custom help message')

        expect(client.Counter).toHaveBeenCalledWith({
            name: 'customCounter',
            labelNames: ['label1', 'label2'],
            help: 'Custom help message',
        })
    })
})
