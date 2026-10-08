import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {relations} from './drizzle.relations'

export const DRIZZLE = 'DRIZZLE';

export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: (config: ConfigService) => {
    const pool = new Pool({connectionString: config.get('DATABASE_URL')});
    return drizzle({client: pool, relations})
  },
  inject: [ConfigService]
};