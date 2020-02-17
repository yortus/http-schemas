import axios from 'axios';
import * as pathToRegExp from 'path-to-regexp';
import {ParamNames, Paths, RequestPayload, ResponsePayload, HttpSchema} from './create-http-schema';


/** Returns a strongly typed object for making requests to a remote HTTP server that implements the given `schema`. */
export function createHttpClient<S extends HttpSchema>(schema: S, options?: Partial<HttpClientOptions>): HttpClient<S> {

    // Create an axios client for making actual HTTP requests. Initialise it with the relevent given options, if any.
    const axiosClient = axios.create({
        timeout: options?.timeout ?? 0,
        withCredentials: options?.withCredentials ?? false,
    });

    // Return a new app/router with some overridden methods. The original app/router is left unchaged.
    let result: HttpClient<S> = {
        get: (path, info?) => request('GET', path, info),
        post: (path, info?) => request('POST', path, info),
    };
    return result;

    // This function makes the actual HTTP requests through axios.
    async function request(method: 'GET' | 'POST', path: string, info?: {params?: any, payload?: any}) {

        // Create the actual URL by substituting params (if any) into the path pattern.
        // NB: what axios calls `params` are really queryparams, so different from our `params`,
        // which are part of the path that is pattern-matched by express on the server.
        let url = pathToRegExp.compile(path)(info?.params);

        // Make the HTTP request through axios. We don't validate outgoing/incoming
        // payloads, since this is running on an untrusted client anyway.
        let res = await axiosClient({method, url, data: info?.payload});

        // If the server returned a 4xx or 5xx error, throw it.
        if (res.status >= 400) {
            throw new Error(`There was an error communicating with the server: ${res.status} ${res.statusText}`);
        }

        // Return the payload received from the server.
        return res.data;
    }
}


/** Options for `createHttpClient`. */
export interface HttpClientOptions {
    /**
     * Specifies the number of milliseconds before the request times out.
     * A value of zero indicates no timeout should be applied. Default is zero.
     */
    timeout: number;

    /**
     * Indicates whether or not cross-site Access-Control requests should
     * be made using credentials. Default is false. See Axios docs.
     */
    withCredentials: boolean,
}


/** Strongly typed object for making requests to a remote HTTP server that implements the schema `S`. */
export type HttpClient<S extends HttpSchema> = {
    get<P extends Paths<S, 'GET'>>(
        path: P,
        ...info: HasParamsOrPayload<S, 'GET', P> extends false
            ? [RequestInfo<S, 'GET', P>?]   // make the `info` arg optional if this route has no params/payload
            : [RequestInfo<S, 'GET', P>]    // make the `info` arg required if this route does have params/payload
    ): Promise<ResponsePayload<S, 'GET', P>>;
    post<P extends Paths<S, 'POST'>>(
        path: P,
        ...info: HasParamsOrPayload<S, 'POST', P> extends false
            ? [RequestInfo<S, 'POST', P>?]  // make the `info` arg optional if this route has no params/payload
            : [RequestInfo<S, 'POST', P>]   // make the `info` arg required if this route does have params/payload
    ): Promise<ResponsePayload<S, 'POST', P>>;
};


/** Strongly-typed object used to provide details for a HTTP request to a specific route. */
type RequestInfo<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path'] = string> =
    & (HasParams<S, M, P> extends true
        ? {params: Record<ParamNames<S, M, P>, string>} // make `params` requierd if this route does have params
        : {params?: Record<string, never>})             // make `params` optional if this route has no params
    & (HasPayload<S, M, P> extends true
        ? {payload: RequestPayload<S, M, P>}            // make `payload` required if this route does have a payload
        : {payload?: never})                            // make `payload` optional if this route has no payload


/** Helper type that resolves to `true` if the route for the given method/path has defined paramNames. */
type HasParams<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = ParamNames<S, M, P> extends never ? false : true;


/** Helper type that resolves to `true` if the route for the given method/path has defined requestPayload. */
type HasPayload<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = RequestPayload<S, M, P> extends undefined ? false : true;


/** Helper type that resolves to `true` if the route for the given method/path has paramNames and/or requestPayload. */
type HasParamsOrPayload<S extends HttpSchema, M extends 'GET' | 'POST', P extends S[any]['path']>
    = HasParams<S, M, P> extends true ? true : HasPayload<S, M, P>;
