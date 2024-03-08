import { ErrorType } from '@diia-inhouse/errors'

export enum RequestStatus {
    Successful = 'successful',
    Failed = 'failed',
}

export enum RequestMechanism {
    Moleculer = 'moleculer',
    Grpc = 'grpc',
    Http = 'http',
    GrpcTranscoder = 'grpc-transcoder',
    HttpMoleculer = 'http-moleculer',
}

class TotalRequestsLabelsMapConcrete {
    status: RequestStatus = RequestStatus.Successful

    mechanism: RequestMechanism = RequestMechanism.Grpc

    statusCode?: string | number = 200

    source = 'Address'

    destination = 'Address'

    errorType?: ErrorType = ErrorType.Operated

    route?: string = ''
}

export type TotalRequestsLabelsMap = TotalRequestsLabelsMapConcrete

export const totalRequestsAllowedFields = <(keyof TotalRequestsLabelsMap)[]>Object.keys(new TotalRequestsLabelsMapConcrete())

export const requestHistogramDefaultBuckets = [0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10]

export const responseHistogramDefaultBuckets = [0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10]
