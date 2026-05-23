import type { RequestHandler } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'

export type AppRequestHandler = RequestHandler

export type BodyRequestHandler<TBody> = RequestHandler<ParamsDictionary, unknown, TBody>

export type ParamsRequestHandler<TParams extends ParamsDictionary> = RequestHandler<TParams>

export type ParamsBodyRequestHandler<TParams extends ParamsDictionary, TBody> = RequestHandler<TParams, unknown, TBody>

export type QueryRequestHandler<TQuery> = RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  Record<string, unknown> & Partial<Record<keyof TQuery, unknown>>
>
