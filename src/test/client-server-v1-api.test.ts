import * as chai from 'chai';
import {createTestClient} from './fixtures/test-client';
import {createGetOnlyServer, createTestServer} from './fixtures/test-server-v1-api';
import {testSchemaFromObject} from './fixtures/test-schemas';

const {expect} = chai;

describe('Implementing a HTTP client and server (v1.x API)', () => {
    const client = createTestClient(testSchemaFromObject);
    const server = createTestServer(testSchemaFromObject);
    before(server.start);
    after(server.stop);
    it('GET /random-numbers', async () => {
        const rnds = await client.get('/random-numbers');
        expect(rnds).to.be.an('array');
        rnds.every(n => expect(n).to.be.a('number'));
        expect(server.logMessages.at(-1)).equals('Incoming request: /random-numbers');
    });
    it('POST /sum', async () => {
        const sum = await client.post('/sum', {body: [1, 2, 3, 4]});
        expect(sum).equals(10);
        expect(server.logMessages.at(-1)).equals('Incoming request: /sum');
    });
    it('POST /product', async () => {
        const prod = await client.post('/product', {body: [10, 20, 30, 40]});
        expect(prod).equals(240_000);
        expect(server.logMessages.at(-1)).equals('Incoming request: /product');
    });
    it('GET *', async () => {
        const msg = await client.get('*', {params: {0: '/hello'}, body: {name: 'foo'}});
        expect(msg).equals('Hello, foo!');
        expect(server.logMessages.at(-1)).equals('Incoming request: /hello');
    });
    it('GET * (invalid)', async () => {
        const getMsg = () => client.get('*', {params: {0: '/ciao'}, body: {name: 'bella'}});
        const msg = await getMsg().catch(() => 'ERROR!!');
        expect(msg).equals('ERROR!!');
        expect(server.logMessages.at(-1)).equals('Incoming request: /ciao');
    });
    it('PUT /multiply', async () => {
        const prod = await client.put('/multiply', {body: {first: 2, second:5}});
        expect(prod).equals(10);
        expect(server.logMessages.at(-1)).equals('Incoming request: /multiply');
    });
    it('Server-side validation error', async () => {
        const invalid = await client.post('/sum', {body: [1, '2', 3, 4] as number[]});
        expect(invalid).to.include({success: false, code: 'MY_CUSTOM_VALIDATION_ERROR'});
        expect(server.logMessages.at(-1)).equals(`Error: [ 1, '2', 3, 4 ] does not conform to type Array<number>`);
    });
});

describe('HTTP Server without JSON parser', () => {
    const client = createTestClient(testSchemaFromObject);
    const server = createGetOnlyServer();
    before(server.start);
    after(server.stop);

    it('GET /random-numbers works without json body parser', async () => {
        const rnds = await client.get('/random-numbers');
        expect(rnds).to.be.an('array');
        rnds.every(n => expect(n).to.be.a('number'));
    });
})
