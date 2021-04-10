import { Express } from "express";
import faker from "faker";
import postgres from "../src/db/postgres";
import request from "supertest";
import { initServer } from "../src/app";

interface GeneratedUser {
  email: string;
  master_hash: string;
}

const headers = {
  "Content-Type": "application/json",
};

const generateUsers = (n: number = 2): Array<GeneratedUser> => {
  const users: Array<GeneratedUser> = [];
  for (let index = 0; index < n; index++) {
    users.push({
      email: faker.internet.email(),
      master_hash: faker.internet.password(),
    });
  }
  return users;
};

const deleteUser = async (user: GeneratedUser): Promise<boolean> => {
  const queryResponse = await postgres.query(
    "DELETE FROM users WHERE email = $1",
    [user.email]
  );
  return queryResponse.rowCount == 1;
};

const whoAmi = async (
  app: Express,
  token: string
): Promise<{ user_id: string; email: string }> => {
  const response = await request(app)
    .get("/api/account/whoami")
    .set({ ...headers, Authorization: `Bearer ${token}` });
  return response.body;
};

describe("User functions", () => {
  let users: Array<GeneratedUser> = [];
  const tokenMap: { [email: string]: string } = {};
  let app: Express;
  beforeAll(async () => {
    app = await initServer();
    users = await generateUsers();
  });
  it("Check availability", async () => {
    for await (const user of users) {
      const response = await request(app)
        .get(`/api/register/available?email=${user.email}`)
        .set(headers);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Create users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/register")
        .set(headers)
        .send(JSON.stringify(user));
      expect(response.body.user_id).toBeTruthy();
    }
  });
  it("Login users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/login")
        .set(headers)
        .send(JSON.stringify(user));
      const tokenResp = response.body;
      expect(tokenResp.device_id).toBeTruthy();
      tokenMap[user.email] = tokenResp.token;
    }
  });
  it(
    "Check whoami",
    async () => {
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          const element = tokenMap[email];
          const response = await whoAmi(app, element);
          expect(response.email).toEqual(email);
        }
      }
    },
    10 * 1000
  );
  afterAll(async () => {
    for await (const user of users) {
      await deleteUser(user);
    }
  });
});
