import { Express } from "express";
import { includes } from "lodash";
import faker from "faker";
import request from "supertest";
import {
  getMasterKey,
  getMasterHash,
  getEncryptionKey,
  generateSymKey,
  aesEncrypt,
  aesDecrypt,
  generateRsaPair,
  rsaEncrypt,
  rsaDecrypt,
  symEncrypt,
  symDecrypt,
} from "betro-js-lib";
import { initServer } from "../src/app";
import postgres from "../src/db/postgres";
import { GroupResponse } from "../src/interfaces/responses/GroupResponse";
import {
  PostResponse,
  PostUserResponse,
  PostsFeedResponse,
} from "../src/interfaces/responses/PostResponse";

interface GeneratedUser {
  credentials: {
    email: string;
    master_hash: string;
  };
  password: string;
  encryption_key: string;
  encryption_mac: string;
  keys: { publicKey?: string; privateKey?: string; symKey?: string };
  groups?: Array<GroupResponse>;
  id?: string;
}

const headers = {
  "Content-Type": "application/json",
};

const generateUsers = async (n: number = 2): Promise<Array<GeneratedUser>> => {
  const users: Array<GeneratedUser> = [];
  for (let index = 0; index < n; index++) {
    let email = faker.internet.email();
    while (
      includes(
        users.map((a) => a.credentials.email),
        email
      )
    ) {
      email = faker.internet.email();
    }
    const password = faker.internet.password();
    const masterKey = await getMasterKey(email, password);
    const master_hash = await getMasterHash(masterKey, password);
    const { encryption_key, encryption_mac } = await getEncryptionKey(
      masterKey
    );
    users.push({
      credentials: {
        email: email,
        master_hash: master_hash,
      },
      password,
      encryption_key,
      encryption_mac,
      keys: {},
    });
  }
  return users;
};

const deleteUser = async (user: GeneratedUser): Promise<boolean> => {
  const queryResponse = await postgres.query(
    "DELETE FROM users WHERE email = $1",
    [user.credentials.email]
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
        .get(`/api/register/available?email=${user.credentials.email}`)
        .set(headers);
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Create users", async () => {
    for await (const user of users) {
      const { publicKey, privateKey } = await generateRsaPair();
      const encryptedPrivateKey = await aesEncrypt(
        user.encryption_key,
        user.encryption_mac,
        Buffer.from(privateKey, "base64")
      );
      const response = await request(app)
        .post("/api/register")
        .set(headers)
        .send(
          JSON.stringify({
            ...user.credentials,
            public_key: publicKey,
            private_key: encryptedPrivateKey,
          })
        );
      expect(response.status).toEqual(200);
      expect(response.body.user_id).toBeTruthy();
    }
  });
  it("Login users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/login")
        .set(headers)
        .send(JSON.stringify(user.credentials));
      expect(response.status).toEqual(200);
      expect(response.body.device_id).toBeTruthy();
      tokenMap[user.credentials.email] = response.body.token;
      user.keys["publicKey"] = response.body.public_key;
      user.keys["privateKey"] = response.body.private_key;
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
          expect(response.body.user_id).toBeTruthy();
          const userIndex = users.findIndex(
            (a) => a.credentials.email == email
          );
          users[userIndex].id = response.body.user_id;
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
        const symKey = await generateSymKey();
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex]).toBeTruthy();
        const encryptedSymKey = await aesEncrypt(
          users[userIndex].encryption_key,
          users[userIndex].encryption_mac,
          Buffer.from(symKey, "base64")
        );
        users[userIndex].keys["symKey"] = symKey;
        const response = await request(app)
          .post("/api/groups")
          .send({
            name: "Followers",
            sym_key: encryptedSymKey,
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
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex].keys["symKey"]).toBeTruthy();
        const encryptedSymKey = response.body[0].sym_key;
        const symKeyData = await aesDecrypt(
          users[userIndex].encryption_key,
          users[userIndex].encryption_mac,
          encryptedSymKey
        );
        expect(symKeyData.isVerified).toEqual(true);
        if (symKeyData.isVerified) {
          expect(symKeyData.data.toString("base64")).toEqual(
            users[userIndex].keys["symKey"]
          );
        }
        users[userIndex].groups = response.body;
      }
    }
  });
  it("Follows user", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .post("/api/follow")
      .set({ ...headers, Authorization: `Bearer ${token1}` })
      .send({
        followee_id: user2.id,
      });
    expect(response.status).toEqual(200);
    expect(response.body.is_approved).toEqual(false);
  });
  it("Check approvals and Approve users", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/follow/approvals")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].follower_id).toEqual(user1.id);
    const publicKey = response.body[0].public_key;
    const symKey = user2.keys["symKey"];
    const symKeyEncrypted = await rsaEncrypt(
      publicKey,
      Buffer.from(symKey, "base64")
    );
    const resp = await request(app)
      .post("/api/follow/approve")
      .set({ ...headers, Authorization: `Bearer ${token2}` })
      .send({
        follow_id: response.body[0].id,
        sym_key: symKeyEncrypted,
        group_id: user2.groups[0].id,
      });
    expect(resp.status).toEqual(200);
    expect(resp.body.approved).toEqual(true);
  });
  it("Check followers", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/follow/followers")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].user_id).toEqual(user1.id);
  });
  it("Check followees", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/follow/followees")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].user_id).toEqual(user2.id);
  });
  it("Create new post", async () => {
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const data = "My First Post";
    const encrypted = await symEncrypt(user2.keys["symKey"], Buffer.from(data));
    const response = await request(app)
      .post("/api/post")
      .send({ group_id: user2.groups[0].id, text_content: encrypted })
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.text_content).toEqual(encrypted);
  });
  it("Fetches user posts", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get(`/api/user/${user2.id}/posts`)
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.posts.length).toEqual(1);
    const body: PostsFeedResponse = response.body;
    const posts: Array<PostResponse> = body.posts;
    const keys = body.keys;
    const userresponse = body.users;
    const sym_key = keys[posts[0].key_id];
    const priv_key = await aesDecrypt(
      user1.encryption_key,
      user1.encryption_mac,
      user1.keys.privateKey
    );
    const symkey = await rsaDecrypt(priv_key.data.toString("base64"), sym_key);
    const data = await symDecrypt(
      symkey.toString("base64"),
      posts[0].text_content
    );
    expect(data.toString("utf-8")).toEqual("My First Post");
  });
  it("Deletes group", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex].groups.length).toEqual(1);
        const response = await request(app)
          .delete(`/api/groups/${users[userIndex].groups[0].id}`)
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.deleted).toEqual(true);
      }
    }
  });
  afterAll(async () => {
    for await (const user of users) {
      await deleteUser(user);
    }
  });
});
