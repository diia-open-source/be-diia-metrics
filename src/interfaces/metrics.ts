import * as client from 'prom-client'

import { ErrorType } from '@diia-inhouse/errors'

export type CustomLabelsValidate<M = TotalRequestsLabelsMap> = (rawLabels: Partial<M>) => Partial<M>

export type KeysOfUnion<T> = T extends T ? keyof T : never

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
    Rabbitmq = 'rabbitmq',
}

export type LabelsType<T> = Partial<Record<keyof T, string | number | undefined>>

export interface MetricOptions<M extends LabelsType<M>> {
    onCollect?: () => { labels: Partial<M>; value: number }
    registry?: client.Registry
}

class TotalRequestsLabelsMapConcrete {
    status: RequestStatus = RequestStatus.Successful

    mechanism: RequestMechanism = RequestMechanism.Grpc

    statusCode?: string | number = 200

    errorType?: ErrorType = ErrorType.Operated

    route?: string = ''

    source = 'Address'

    destination = 'Address'
}

export type TotalRequestsLabelsMap = TotalRequestsLabelsMapConcrete

export const totalRequestsAllowedFields = Object.keys(new TotalRequestsLabelsMapConcrete()) as KeysOfUnion<TotalRequestsLabelsMap>[]

export const requestHistogramDefaultBuckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60]

export const responseHistogramDefaultBuckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60]
