import axios, {AxiosRequestConfig} from 'axios';
import * as pathToRegExp from 'path-to-regexp';
import {ParamNames, Paths, RequestBody, ResponseBody} from '../util';
import {HttpSchema} from '../shared';


/** Returns a strongly typed object for making requests to a remote HTTP server that implements the given `schema`. */
export function createHttpClient<S extends HttpSchema>(schema: S, options?: AxiosRequestConfig): HttpClient<S> {

    // Create an axios client for making actual HTTP requests. Initialise it with the relevant given options, if any.
    const axiosClient = axios.create(options);

    return {
        get: (path, info?) => request('GET', path, info),
        post: (path, info?) => request('POST', path, info),
    };

    // This function makes the actual HTTP requests through axios.
    async function request(method: 'GET' | 'POST', path: string, info?: {params?: any, body?: any, queryParams?: AxiosRequestConfig['params']}) {

        // Create the actual URL by substituting params (if any) into the path pattern.
        // NB: what axios calls `params` are really queryparams, so different from our `params`,
        // which are part of the path that is pattern-matched by express on the server.
        // NB2: pathToRegExp doesn't handle '*' wildcards like express, so we substitute those manually below.
        let i = 0;
        let url = pathToRegExp.compile(path)(info?.params).replace(/\*/g, () => info?.params[i++]);

        // Make the HTTP request through axios. We don't validate outgoing/incoming
        // bodies, since this is running on an untrusted client anyway.
        let res = await axiosClient({method, url, data: info?.body, params: info?.queryParams});

        // If the server returned a 4xx or 5xx error, throw it.
        if (res.status >= 400) {
            throw new Error(`There was an error communicating with the server: ${res.status} ${res.statusText}`);
        }

        // Return the body received from the server.
        return res.data;
    }
}

export type HttpClientOptions = AxiosRequestConfig;


/** Strongly typed object for making requests to a remote HTTP server that implements the schema `S`. */
export type HttpClient<S extends HttpSchema> = {
    get<P extends Paths<S, 'GET'>>(
        path: P,
        ...info: HasParamsOrBody<S, 'GET', P> extends false
            ? [RequestInfo<S, 'GET', P>?]   // make the `info` arg optional if this route has no params/body
            : [RequestInfo<S, 'GET', P>]    // make the `info` arg required if this route does have params/body
    ): Promise<ResponseBody<S, 'GET', P>>;
    post<P extends Paths<S, 'POST'>>(
        path: P,
        ...info: HasParamsOrBody<S, 'POST', P> extends false
            ? [RequestInfo<S, 'POST', P>?]  // make the `info` arg optional if this route has no params/body
            : [RequestInfo<S, 'POST', P>]   // make the `info` arg required if this route does have params/body
    ): Promise<ResponseBody<S, 'POST', P>>;
};

/** Strongly-typed object used to provide details for a HTTP request to a specific route. */
type RequestInfo<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path'] = string> =
    & (HasParams<S, M, P> extends true
        ? {params: Record<ParamNames<S, M, P>, string>} // make `params` required if this route does have params
        : {params?: Record<string, never>})             // make `params` optional if this route has no params
    & (HasBody<S, M, P> extends true
        ? {body: RequestBody<S, M, P>}            // make `body` required if this route does have a body
        : {body?: never})                            // make `body` optional if this route has no body
    & {queryParams?: AxiosRequestConfig['params']}


/** Helper type that resolves to `true` if the route for the given method/path has defined paramNames. */
type HasParams<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = ParamNames<S, M, P> extends never ? false : true;


/** Helper type that resolves to `true` if the route for the given method/path has defined requestBody. */
type HasBody<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = RequestBody<S, M, P> extends undefined ? false : true;


/** Helper type that resolves to `true` if the route for the given method/path has paramNames and/or requestBody. */
type HasParamsOrBody<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = HasParams<S, M, P> extends true ? true : HasBody<S, M, P>;
