import { Express } from "express";
import { includes } from "lodash";
import faker from "faker";
import request from "supertest";
import { initServer } from "../src/app";
import postgres from "../src/db/postgres";

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
    let email = faker.internet.email();
    while (
      includes(
        users.map((a) => a.email),
        email
      )
    ) {
      email = faker.internet.email();
    }
    users.push({
      email: email,
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
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Create users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/register")
        .set(headers)
        .send(JSON.stringify(user));
      expect(response.status).toEqual(200);
      expect(response.body.user_id).toBeTruthy();
    }
  });
  it("Login users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/login")
        .set(headers)
        .send(JSON.stringify(user));
      expect(response.status).toEqual(200);
      expect(response.body.device_id).toBeTruthy();
      tokenMap[user.email] = response.body.token;
    }
  });
  it(
    "Check whoami",
    async () => {
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          const token = tokenMap[email];
          const response = await request(app)
            .get("/api/account/whoami")
            .set({ ...headers, Authorization: `Bearer ${token}` });
          expect(response.status).toEqual(200);
          expect(response.body.email).toEqual(email);
        }
      }
    },
    10 * 1000
  );
  it("Fetches user groups", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/groups")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.length).toEqual(0);
      }
    }
  });
  it("Creates user group", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .post("/api/groups")
          .send({
            name: "Followers",
            sym_key: "TEMP_KEY",
            is_default: true,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.id).toBeTruthy();
      }
    }
  });
  it("Verifies groups are created", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/groups")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.length).toEqual(1);
      }
    }
  });
  afterAll(async () => {
    for await (const user of users) {
      await deleteUser(user);
    }
  });
});
