import "@betro/lib/dist/setupNodePollyfill";
import { random } from "lodash";
import { getConnection } from "typeorm";
import { User } from "../../src/entities";
import { bootstrap } from "../../src/app";
import { runTests } from "./testFunction";

const deleteUsers = async (): Promise<boolean> => {
  const queryResponse = await getConnection()
    .getRepository<User>("users")
    .delete({});
  return queryResponse.affected == 1;
};

describe("User functions", () => {
  const port = random(1025, 6000).toString();
  beforeAll((done) => {
    bootstrap(port).then(() => {
      done();
    });
  });

  describe("Run api test", () => runTests(port));

  afterAll(async () => {
    await deleteUsers();
  });
});
