import * as pathToRegExp from 'path-to-regexp';
import {t, TypeInfo} from 'rtti';
import {Anonymize, ExtractMethod, ExtractPath} from '../util';
import {RouteSpec} from './create-http-route';
import {Method, methods} from './methods';
import {RouteInfo} from './route-info';

/**
 * Creates a HttpSchema object from the given route specification object.
 * HTTP schemas may be passed to `createHttpClient` and/or `decorateExpressServer` to implement the schema on the
 * client-side and/or server-side. See those functions for more details.
 * @param routeSpecs an object keyed by route, with values describing the req/res body shape per route.
 */
export function createHttpSchema<RSO extends RouteSpecObject>(routeSpecs: RSO): {[R in keyof RSO]: ExtractRouteInfoFromRSO<RSO, R>};

/**
 * Creates a HttpSchema object from the given route specification array.
 * HTTP schemas may be passed to `createHttpClient` and/or `decorateExpressServer` to implement the schema on the
 * client-side and/or server-side. See those functions for more details.
 * @param routeSpecs an array with one element per route, with each element describing the route and req/res body shape.
 */
export function createHttpSchema<RSA extends ([RouteSpec] | RouteSpec[])>(routeSpecs: RSA): ExtractRouteInfoFromRSA<RSA>;

export function createHttpSchema(routeSpecs: RouteSpecObject | RouteSpec[]) {

    // If the array overload was used, convert to the object format, so all code below is the same for either overload.
    const routeSpecsObject = Array.isArray(routeSpecs) ? convertRouteSpecsArrayToObject(routeSpecs): routeSpecs;

    // Extract and validate route info for each route specified in the schema.
    const schema: HttpSchema = {};
    let route: string;
    for (route in routeSpecsObject) {
        // Extract and validate the method and path.
        const parts = route.split(' ');
        if (parts.length !== 2) throw new Error(`Route must be specified using the format '{METHOD} {PATH}'`);
        const [method, path] = parts;
        if (!methods.includes(method as any)) throw new Error(`Unsupported method '${method}'. Expected one of: ${methods.join(', ')}`);

        // Extract the named params.
        // NB: pathToRegExp doesn't handle '*' wildcards like express, so we replace those with (.*) in the path.
        let pathParams = pathToRegExp.parse(path.replace(/\*/g, '(.*)')).filter(p => typeof p !== 'string') as pathToRegExp.Key[];
        if (pathParams.some(p => p.optional || p.repeat)) throw new Error(`Optional/repeated parameters are not supported`);
        let namedParams = pathParams.map(p => String(p.name));

        // Extract the req/res body shapes.
        const requestBody: TypeInfo = (routeSpecsObject as any)[route].requestBody ?? t.unknown;
        const responseBody: TypeInfo = (routeSpecsObject as any)[route].responseBody ?? t.unknown;

        schema[route] = {
            method: method as Method,
            path,
            namedParams,
            requestBody,
            responseBody,
        };
    }
    return schema as any;
}

/** Route specifications, given as an object keyed by route, with values describing the req/res body shape per route. */
export interface RouteSpecObject {
    [route: `${Method} ${string}`]: {requestBody?: TypeInfo, responseBody?: TypeInfo}
}

/** A HTTP Schema declared as an object keyed by route, with values containing detailed information about each route. */
export interface HttpSchema {
    [route: string]: RouteInfo;
}

// Helper function to convert route spec array to route spec object
function convertRouteSpecsArrayToObject(routeSpecs: RouteSpec[]): RouteSpecObject {
    const obj: RouteSpecObject = {};
    for (const {method, path, requestBody, responseBody} of routeSpecs) {
        obj[`${method} ${path}`] = {requestBody, responseBody};
    }
    return obj;
}

type ExtractRouteInfoFromRSO<RSO, Route extends keyof RSO> = Anonymize<{
    method: ExtractMethod<Route>;
    path: ExtractPath<Route>;
    namedParams: Array<ExtractNamedParams<ExtractPath<Route>> | ExtractNumberedParams<ExtractPath<Route>>>;
    requestBody: RSO[Route] extends {requestBody: infer T} ? T : never;
    responseBody: RSO[Route] extends {responseBody: infer T} ? T : never;
}>;

type ExtractRouteInfoFromRSA<RSA extends [RouteSpec] | RouteSpec[]> = Anonymize<{
    [K in keyof RSA as K extends `${number}` ? RSA[K] extends RouteSpec<infer M, infer P> ? `${M} ${P}` : never : never]: RSA[K] extends RouteSpec<infer M, infer P> ? {
        method: M;
        path: P;
        namedParams: Array<ExtractNamedParams<P> | ExtractNumberedParams<P>>;
        requestBody: RSA[K] extends {requestBody: infer T} ? T : never;
        responseBody: RSA[K] extends {responseBody: infer T} ? T : never;
    } : never;
}>;

type ExtractNamedParams<Path, Parts = Tail<Split<Path, ':'>>> = ExtractUntilDelim<Parts[any]>;

type ExtractUntilDelim<S>
    = S extends `${Delim}${string}` ? ''
    : S extends `${infer First}${infer Rest}` ? `${First}${ExtractUntilDelim<Rest>}`
    : '';

type Delim = '/' | ':' | '-' | '.' | '~' | '!' | '$' | '&' | "'" | '(' | ')' | '*' | '+' | ',' | ';' | '=' | '@' | '%';

type ExtractNumberedParams<Path, Parts = Split<Path, '/'>>
    = Filter<Parts, '*'> extends [...infer U] ? {[K in keyof U]: K}[any] : never;

type Split<Str, Sep extends string>
    = Str extends `${infer First}${Sep}${infer Rest}` ? [First, ...Split<Rest, Sep>]
    : [Str];

type Tail<Tuple extends any[]> = Tuple extends [any, ...infer Rest] ? Rest : never;

type Filter<Tuple, U>
    = Tuple extends [infer First, ...infer Rest]
        ? First extends U ? [U, ...Filter<Rest, U>]
        : Filter<Rest, U>
    : [];
