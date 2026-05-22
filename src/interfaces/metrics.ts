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

export interface TotalRequestsLabelsMap {
    status: RequestStatus
    mechanism: RequestMechanism
    statusCode?: string | number
    errorType?: ErrorType
    route?: string
    source: string
    destination: string
}

export const totalRequestsAllowedFields: KeysOfUnion<TotalRequestsLabelsMap>[] = [
    'status',
    'mechanism',
    'statusCode',
    'errorType',
    'route',
    'source',
    'destination',
]

export const requestHistogramDefaultBuckets: number[] = [
    0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60,
]

export const responseHistogramDefaultBuckets: number[] = [
    0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60,
]
