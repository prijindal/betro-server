import fs from "fs";
import pino from "pino";
import dotenv from "dotenv";

if (fs.existsSync(".env")) {
  pino().debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
} else {
  pino().debug(
    "Using .env.example file to supply config environment variables"
  );
  dotenv.config({ path: ".env.example" }); // you can delete this after you create your own .env file!
}

export const ENVIRONMENT = process.env.NODE_ENV || "development";

export const PORT = process.env["PORT"];
export const POSTGRES_URI = process.env["POSTGRES_URI"];
export const REDIS_URI = process.env["REDIS_URI"];
export const SECRET = process.env["SECRET"];
export const LOGGER_LEVEL = process.env["LOGGER_LEVEL"] || "info";
export const logger = pino({ level: LOGGER_LEVEL });

if (!POSTGRES_URI) {
  logger.error(
    "No postgres connection string. Set POSTGRES_URI environment variable."
  );
  process.exit(1);
}
