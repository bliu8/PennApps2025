declare module 'express' {
  const express: any;
  export default express;
  export type Request = any;
  export type Response = any;
  export type NextFunction = (...args: any[]) => any;
}

declare module 'cors' {
  const cors: any;
  export default cors;
}

declare module 'multer' {
  const multer: any;
  export default multer;
}

declare module 'axios' {
  const axios: any;
  export default axios;
}

declare module 'mongodb' {
  export type Db = any;
  export class MongoClient {
    constructor(uri: string);
    connect(): Promise<void>;
    db(name?: string): Db;
    close(): Promise<void>;
  }
}

declare module 'dotenv' {
  export function config(options?: { path?: string }): void;
}

declare module 'node:path' {
  const path: {
    resolve: (...segments: string[]) => string;
  };
  export default path;
}

declare var process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};
