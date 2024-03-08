import http from 'http'

import { TotalRequestsLabelsMap } from 'src/interfaces'

export function validateTotalRequestsLabels(rawLabels: TotalRequestsLabelsMap): TotalRequestsLabelsMap {
    const { errorType, statusCode, ...restlabels } = rawLabels
    const labels: TotalRequestsLabelsMap = restlabels

    if (errorType === undefined) {
        delete labels.errorType
    } else {
        labels.errorType = rawLabels.errorType
    }

    if (isNaN(Number(rawLabels.statusCode))) {
        delete labels.statusCode
    } else {
        labels.statusCode = rawLabels.statusCode
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
