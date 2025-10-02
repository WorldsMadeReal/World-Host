import { IncomingMessage, ServerResponse } from 'node:http';
import Fastify from 'fastify';
import type { AppContext } from './app.js';
export declare function createHttpServer(context: AppContext): Fastify.FastifyInstance<import("http").Server<typeof IncomingMessage, typeof ServerResponse>, IncomingMessage, ServerResponse<IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault> & PromiseLike<Fastify.FastifyInstance<import("http").Server<typeof IncomingMessage, typeof ServerResponse>, IncomingMessage, ServerResponse<IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault>>;
//# sourceMappingURL=http.d.ts.map