import {createHttpRoute, createHttpSchema, t} from '../../shared';

export type TestSchema = typeof testSchemaFromObject;

export const testSchemaFromObject = createHttpSchema({
    'GET /random-numbers': {
        responseBody: t.array(t.number),
    },
    'POST /sum': {
        requestBody: t.array(t.number),
        responseBody: t.number,
    },
    'POST /product': {
        requestBody: t.array(t.number),
        responseBody: t.number,
    },
    'GET *': {
        requestBody: t.object({
            name: t.string
        }),
        responseBody: t.unknown,
    },
    'PUT /multiply': {
        requestBody: t.object({first: t.number, second: t.number}),
        responseBody: t.number,
    },
});

export const testSchemaFromArray = createHttpSchema([
    createHttpRoute({
        method: 'GET',
        path: '/random-numbers',
        responseBody: t.array(t.number),
    }),
    createHttpRoute({
        method: 'POST',
        path: '/sum',
        requestBody: t.array(t.number),
        responseBody: t.number,
    }),
    createHttpRoute({
        method: 'POST',
        path: '/product',
        requestBody: t.array(t.number),
        responseBody: t.number,
    }),
    createHttpRoute({
        method: 'GET',
        path: '*',
        paramNames: ['0'],
        requestBody: t.object({name: t.string}),
        responseBody: t.unknown,
    }),
    createHttpRoute({
        method: 'PUT',
        path:'/multiply',
        requestBody: t.object({first: t.number, second: t.number}),
        responseBody: t.number,
    }),
]);

export const testSchemaGetOnly = createHttpSchema({
    // Used for testing get request without json body parser
    'GET /random-numbers': {
        responseBody: t.array(t.number),
    },
});
