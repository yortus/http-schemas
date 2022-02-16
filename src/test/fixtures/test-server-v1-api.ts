import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as useragent from 'express-useragent';
import * as http from 'http';
import {createRequestHandler, decorateExpressRouter, t} from '../../server';
import {testSchemaGetOnly, TestSchema} from './test-schemas';


export function createTestServer(testSchema: TestSchema) {

    const logMessages: string[] = [];

    // Logging middleware
    const log: express.RequestHandler = (req, _, next) => {
        logMessages.push(`Incoming request: ${req.path}`);
        next();
    }

    const RequestProps = t.object({
        // `req.useragent` prop added by useragent middleware
        useragent: t.object({
            isMobile: t.boolean,
            isDesktop: t.boolean,
            browser: t.string,
            os: t.string,
            platform: t.string,
            // ...and more
        }),
    });

    // Implement the HTTP schema using an Express Router instance.
    const typedRoutes = decorateExpressRouter({
        schema: testSchema,
        requestProps: RequestProps,
        onValidationError: (err, _, res) => {
            logMessages.push(err.toString());
            res.status(200).send({success: false, code: 'MY_CUSTOM_VALIDATION_ERROR'});
        },
    });

    // Specify some route handlers inline
    typedRoutes.get('/random-numbers', [log], (req, res) => {
        req.useragent.isMobile;
        res.send([
            Math.random(),
            Math.random(),
            Math.random(),
        ]);
    });

    typedRoutes.post('/sum', [log], (req, res) => {
        let result = req.body.reduce((sum, n) => sum + n, 0);
        res.send(result);
    });

    // Specify some route handlers separately and then add them to the app.
    const handleProduct = createRequestHandler({
        schema: testSchema,
        route: 'POST /product',
        requestProps: RequestProps,
        handler: (req, res) => {
            req.useragent.isMobile;
            let result = req.body.reduce((sum, n) => sum * n, 1);
            res.status(200).send(result);
        }
    });
    const handleWildcard = createRequestHandler(testSchema, 'GET *', (req, res) => {
        if (req.params['0'] === '/hello') {
            res.status(200).send(`Hello, ${req.body.name}!`);
        }
        else {
            res.status(500).send('Server error');
        }
    });
    const handleMultiply = createRequestHandler({
        schema: testSchema,
        route: 'PUT /multiply',
        requestProps: RequestProps,
        handler: (req, res) => {
            const {first, second} = req.body;
            const result = first * second;
            res.send(result);
        }
    });
    typedRoutes.post('/product', [log], handleProduct);
    typedRoutes.put('/multiply', [log], handleMultiply);
    typedRoutes.get('*', [log], handleWildcard);

    // Create an Express Application and add middleware to it, including our HTTP schema implementation.
    const app = express();
    app.use(compression());
    app.use(cookieParser());
    app.use(useragent.express());
    app.use(bodyParser.json());
    app.use('/api', typedRoutes);

    // Return an object that allows the caller to start and stop the HTTP server.
    return {
        start() {
            return new Promise<void>(resolve => {
                server = app.listen(8000, () => resolve());
            });
        },
        stop() {
            return new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        },
        logMessages,
    };
}


let server: http.Server;


const log: express.RequestHandler = (req, _, next) => {
    console.log(`Incoming request: ${req.path}`);
    next();
}

export const createGetOnlyServer = () => {

    // Implement the HTTP schema using an Express Router instance.
    const typedRoutes = decorateExpressRouter({
        schema: testSchemaGetOnly,
    });

    // Specify some route handlers inline
    typedRoutes.get('/random-numbers', [log], (req, res) => {
        res.send([
            Math.random(),
            Math.random(),
            Math.random(),
        ]);
    });

    // Create an Express Application and add middleware to it, including our HTTP schema implementation.
    const app = express();
    app.use(compression());
    app.use(cookieParser());
    app.use('/api', typedRoutes);

    // Return an object that allows the caller to start and stop the HTTP server.
    let server: http.Server;
    return {
        start() {
            return new Promise<void>(resolve => {
                server = app.listen(8000, () => resolve());
            });
        },
        stop() {
            return new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        },
    };
}
