import * as http from 'node:http'

import { TotalRequestsLabelsMap } from 'src/interfaces'

import { ErrorType } from '@diia-inhouse/errors'

export function validateTotalRequestsLabels(rawLabels: Partial<TotalRequestsLabelsMap>): Partial<TotalRequestsLabelsMap> {
    const { errorType, statusCode, ...restlabels } = rawLabels
    const labels: Partial<TotalRequestsLabelsMap> = { ...restlabels }

    const isErrorTypeValid = errorType && Object.values(ErrorType).includes(errorType)

    if (errorType === undefined) {
        delete labels.errorType
    } else if (isErrorTypeValid) {
        labels.errorType = errorType
    } else {
        labels.errorType = ErrorType.Unoperated
    }

    if (Number.isNaN(Number(statusCode))) {
        delete labels.statusCode
    } else {
        labels.statusCode = statusCode
    }

    return labels
}

export function makeRequest(url: string, timeout = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = http.get(url, { timeout }, (res) => {
            res.on('error', (e) => {
                reject(e)
            })

            res.setEncoding('utf8')
            let response = ''

            res.on('data', (chunk) => {
                response += chunk
            })

            res.on('end', () => {
                resolve(response)
            })
        })

        request.on('error', reject)
        request.on('timeout', () => reject(new Error(`Timeout on ${url}`)))
    })
}
