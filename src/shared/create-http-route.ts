import {TypeInfo} from 'rtti';
import {Method} from './methods';


/** Convenience function for defining a single route within a HTTP schema. */
export function createHttpRoute<
    M extends Method,
    P extends string,
    T extends RouteSpec<M, P>
>(info: T & {[K in keyof T]: K extends keyof RouteSpec ? T[K] : never}): T {
    return info;
}

export interface RouteSpec<M extends Method = Method, P extends string = string> {
    method: M;
    path: P;
    paramNames?: string[];
    requestBody?: TypeInfo;
    responseBody?: TypeInfo;
}
