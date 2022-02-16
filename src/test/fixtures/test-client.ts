import {createHttpClient} from '../../client';
import {TestSchema} from './test-schemas';

export function createTestClient(schema: TestSchema) {
    return createHttpClient(schema, {
        baseURL: 'http://localhost:8000/api',
    });
}
