// NB: express imports will be elided in the built js code, since we are only importing types.
import {NextFunction, Request, RequestHandler as ExpressRequestHandler, Response} from 'express';
import {TypeInfo} from 'rtti';
import {ExtractMethod, ExtractPath, NamedParams, RequestBody, ResponseBody} from '../util';
import {HttpSchema, Method} from '../shared';


/**
 * Accepts and returns a request handler function that is strongly-typed to match the given schema definition for the
 * given method and path. The function is returned as-is. This helper just provides convenient contextual typing.
 */
export function createRequestHandler<S extends HttpSchema, R extends keyof S>(
    schema: S,
    route: R,
    handler: RequestHandler<S, ExtractMethod<R>, ExtractPath<R>, {}>
): RequestHandler<S, ExtractMethod<R>, ExtractPath<R>, {}>;

/**
 * Accepts and returns a request handler function that is strongly-typed to match the given schema definition for the
 * given method and path. The function is returned as-is. This helper just provides convenient contextual typing.
 */
export function createRequestHandler<S extends HttpSchema, R extends keyof S, ReqProps extends TypeInfo = TypeInfo<{}>>(
    options: {
        schema: S,
        route: R,
        requestProps?: ReqProps
        handler: RequestHandler<S, ExtractMethod<R>, ExtractPath<R>, ReqProps['example']>
    }
): RequestHandler<S, ExtractMethod<R>, ExtractPath<R>, {}>;

/**
 * Accepts and returns a request handler function that is strongly-typed to match the given schema definition for the
 * given method and path. The function is returned as-is. This helper just provides convenient contextual typing.
 */
export function createRequestHandler<S extends HttpSchema, M extends Method, P extends S[any]['path']>(
    schema: S,
    method: M,
    path: P,
    handler: RequestHandler<S, M, P, {}>
): RequestHandler<S, M, P, {}>;

/**
 * Accepts and returns a request handler function that is strongly-typed to match the given schema definition for the
 * given method and path. The function is returned as-is. This helper just provides convenient contextual typing.
 */
export function createRequestHandler<S extends HttpSchema, M extends Method, P extends S[any]['path'], ReqProps extends TypeInfo = TypeInfo<{}>>(
    options: {
        schema: S,
        method: M,
        path: P,
        requestProps?: ReqProps
        handler: RequestHandler<S, M, P, ReqProps['example']>
    }
): RequestHandler<S, M, P, {}>;

export function createRequestHandler(optionsOrSchema: unknown, _methodOrRoute?: unknown, pathOrHandler?: unknown, handler?: unknown): ExpressRequestHandler {
    // Distinguish between the various overloads.
    let h = handler
        ? handler as ExpressRequestHandler
        : pathOrHandler
            ? pathOrHandler as ExpressRequestHandler
            : (optionsOrSchema as any).handler as ExpressRequestHandler;
    let requestProps = pathOrHandler ? undefined : (optionsOrSchema as any).requestProps as TypeInfo;

    // If there are no request props to validate, return the given request handler as-is.
    if (!requestProps) return h;

    // Return a wrapped handler that validates the request props before invoking the given handler function.
    return (req, res, next) => {
        requestProps?.assertValid(req);
        h(req, res, next);
    };
}


/** A strongly-typed express request handler. */
export type RequestHandler<S extends HttpSchema, M extends Method, P extends S[any]['path'], Req> =
    (req: TypedRequest<S, M, P, Req>, res: TypedResponse<S, M, P>, next: NextFunction) => void | Promise<void>;


/** A strongly-typed express request. Some original props are omited and replaced with typed ones. */
type TypedRequest<S extends HttpSchema, M extends Method, P extends S[any]['path'], Req> =
    & Omit<Request<Record<NamedParams<S, M, P>, string>>, 'body'>
    & Req
    & {
        body: RequestBody<S, M, P> extends undefined ? {} : RequestBody<S, M, P>;
        [Symbol.asyncIterator](): AsyncIterableIterator<any>; // must add this back; not preserved by mapped types above
    };


/** A strongly-typed express response. Some original props are omited and replaced with typed ones. */
type TypedResponse<S extends HttpSchema, M extends Method, P extends S[any]['path']> =
    & Omit<Response, 'end' | 'json' | 'jsonp' | 'send' | 'status'>
    & {
        end: never;
        json: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
        jsonp: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
        send: (body: ResponseBody<S, M, P>) => TypedResponse<S, M, P>;
        status: (code: number) => TypedResponse<S, M, P>;
    };
