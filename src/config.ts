import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env")) {
  console.debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
} else {
  console.debug(
    "Using .env.example file to supply config environment variables"
  );
  dotenv.config({ path: ".env.example" }); // you can delete this after you create your own .env file!
}

export const ENVIRONMENT = process.env.NODE_ENV;

export const POSTGRES_URI = process.env["POSTGRES_URI"];
export const REDIS_URI = process.env["REDIS_URI"];

if (!POSTGRES_URI) {
  console.error(
    "No mongo connection string. Set MONGODB_URI environment variable."
  );
  process.exit(1);
}
