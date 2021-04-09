import express from "express";
import cors from "cors";

export async function initServer(): Promise<express.Express> {
  const app = express();

  app.set("port", process.env.PORT || 4000);
  app.use(cors());
  app.use(express.json());
  return app;
}
