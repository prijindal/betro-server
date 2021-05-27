import "betro-js-lib/dist/setupNodePollyfill";
import { Express } from "express";
import { random } from "lodash";
import { initServer } from "../../src/app";
import postgres from "../../src/db/postgres";
import { runTests } from "./testFunction";

const deleteUsers = async (): Promise<boolean> => {
  const queryResponse = await postgres("users").delete();
  return queryResponse == 1;
};

describe("User functions", () => {
  let app: Express;
  const port = random(1025, 6000).toString();
  beforeAll((done) => {
    initServer(port).then((a) => {
      app = a;
      app.listen(port, () => {
        done();
      });
    });
  });

  describe("Run api test", () => runTests(port));

  afterAll(async () => {
    await deleteUsers();
  });
});
