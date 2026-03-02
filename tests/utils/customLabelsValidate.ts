import { ErrorType } from '@diia-inhouse/errors'

import { TotalRequestsLabelsMap } from '@src/interfaces'

export function customErrorTypeValidate(rawLabels: Partial<TotalRequestsLabelsMap>): Partial<TotalRequestsLabelsMap> {
    const { errorType, ...restLabels } = rawLabels

    const isErrorTypeValid = errorType && Object.values(ErrorType).includes(errorType)
    const validatedErrorType = isErrorTypeValid ? errorType : ErrorType.Unoperated

    return { ...restLabels, errorType: validatedErrorType }
}
