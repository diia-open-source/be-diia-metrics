import nock from 'nock'

import { ErrorType } from '@diia-inhouse/errors'
import { HttpStatusCode } from '@diia-inhouse/types'

import { RequestMechanism, RequestStatus, TotalRequestsLabelsMap } from '../../../src'
import { makeRequest, validateTotalRequestsLabels } from '../../../src/utils'

describe('validateTotalRequestsLabels', () => {
    it('should remove errorType if undefined', () => {
        const inputLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            statusCode: 200,
            source: 'Address',
            destination: 'Address',
            errorType: undefined,
            route: '',
        }

        const expectedLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            statusCode: 200,
            source: 'Address',
            destination: 'Address',
            route: '',
        }

        const result = validateTotalRequestsLabels(inputLabels)

        expect(result).toEqual(expectedLabels)
    })

    it('should keep errorType if defined', () => {
        const inputLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            statusCode: 200,
            source: 'Address',
            destination: 'Address',
            errorType: ErrorType.Operated,
            route: '',
        }

        const expectedLabels: TotalRequestsLabelsMap = { ...inputLabels }

        const result = validateTotalRequestsLabels(inputLabels)

        expect(result).toEqual(expectedLabels)
    })

    it('should remove statusCode if not a number', () => {
        const inputLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            statusCode: 'NotANumber',
            source: 'Address',
            destination: 'Address',
            errorType: ErrorType.Operated,
            route: '',
        }

        const expectedLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            source: 'Address',
            destination: 'Address',
            errorType: ErrorType.Operated,
            route: '',
        }

        const result = validateTotalRequestsLabels(inputLabels)

        expect(result).toEqual(expectedLabels)
    })

    it('should keep statusCode if a valid number', () => {
        const inputLabels: TotalRequestsLabelsMap = {
            status: RequestStatus.Successful,
            mechanism: RequestMechanism.Grpc,
            statusCode: 200,
            source: 'Address',
            destination: 'Address',
            errorType: ErrorType.Operated,
            route: '',
        }

        const expectedLabels: TotalRequestsLabelsMap = { ...inputLabels }

        const result = validateTotalRequestsLabels(inputLabels)

        expect(result).toEqual(expectedLabels)
    })
})

describe('makeRequest', () => {
    it('should make a successful request', async () => {
        const expectedResponse = 'Mocked response'

        nock('http://example.com').get('/').reply(HttpStatusCode.OK, expectedResponse)
        const result = await makeRequest('http://example.com')

        expect(result).toEqual(expectedResponse)
    })

    it('should handle request error', async () => {
        nock('http://example.com').get('/').replyWithError('Mocked error')

        await expect(makeRequest('http://example.com')).rejects.toThrow('Mocked error')
    })
})
