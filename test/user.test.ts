import "betro-js-lib/dist/setupNodePollyfill";
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
import { generateImage } from "./utils/generateImage";
import {
  PostsFeedResponse,
  PostResponse,
} from "../src/controller/FeedController";
import { GroupResponse } from "../src/controller/GroupController";

interface GeneratedUser {
  credentials: {
    username: string;
    email: string;
    master_hash: string;
  };
  profile: {
    first_name: string;
    last_name: string;
    profile_picture: Buffer;
  };
  password: string;
  encryption_key: string;
  encryption_mac: string;
  keys: {
    publicKey?: string;
    privateKey?: string;
    groupSymKey?: string;
    profileSymKey?: string;
  };
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
    let username = faker.internet.userName();
    while (
      includes(
        users.map((a) => a.credentials.username),
        username
      )
    ) {
      username = faker.internet.userName();
    }
    const password = faker.internet.password();
    const masterKey = await getMasterKey(email, password);
    const master_hash = await getMasterHash(masterKey, password);
    const { encryption_key, encryption_mac } = await getEncryptionKey(
      masterKey
    );
    users.push({
      credentials: {
        username: username,
        email: email,
        master_hash: master_hash,
      },
      profile: {
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
        profile_picture: generateImage(800, 600, 80),
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
  const queryResponse = await postgres("users")
    .where({ email: user.credentials.email })
    .delete();
  return queryResponse == 1;
};

describe("User functions", () => {
  let users: Array<GeneratedUser> = [];
  const tokenMap: { [email: string]: string } = {};
  let app: Express;
  beforeAll(async () => {
    app = await initServer();
    users = await generateUsers();
  });
  it("Check email availability", async () => {
    for await (const user of users) {
      const response = await request(app)
        .get(`/api/register/available/email?email=${user.credentials.email}`)
        .set(headers);
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Check username availability", async () => {
    for await (const user of users) {
      const response = await request(app)
        .get(
          `/api/register/available/username?username=${user.credentials.username}`
        )
        .set(headers);
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Create users", async () => {
    for await (const user of users) {
      const { publicKey, privateKey } = await generateRsaPair();
      const symKey = await generateSymKey();
      const encryptedPrivateKey = await aesEncrypt(
        user.encryption_key,
        user.encryption_mac,
        Buffer.from(privateKey, "base64")
      );
      const encryptedSymKey = await aesEncrypt(
        user.encryption_key,
        user.encryption_mac,
        Buffer.from(symKey, "base64")
      );
      const response = await request(app)
        .post("/api/register")
        .set(headers)
        .send(
          JSON.stringify({
            ...user.credentials,
            public_key: publicKey,
            private_key: encryptedPrivateKey,
            sym_key: encryptedSymKey,
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
      user.keys.publicKey = response.body.public_key;
      user.keys.privateKey = response.body.private_key;
      user.keys.profileSymKey = response.body.sym_key;
    }
  });
  it("Saves profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const symKey = await aesDecrypt(
          user.encryption_key,
          user.encryption_mac,
          user.keys.profileSymKey
        );
        const sym_key = symKey.data.toString("base64");
        const first_name = await symEncrypt(
          sym_key,
          Buffer.from(user.profile.first_name)
        );
        const last_name = await symEncrypt(
          sym_key,
          Buffer.from(user.profile.last_name)
        );
        const profile_picture = await symEncrypt(
          sym_key,
          user.profile.profile_picture
        );
        const response = await request(app)
          .post("/api/account/profile")
          .send({
            first_name: first_name,
            last_name: last_name,
            profile_picture: profile_picture,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
      }
    }
  });
  it("Checks profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const response = await request(app)
          .get("/api/account/profile")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.first_name).toBeTruthy();
        expect(response.body.sym_key).toEqual(user.keys.profileSymKey);
        const { data: symKey } = await aesDecrypt(
          user.encryption_key,
          user.encryption_mac,
          response.body.sym_key
        );
        const firstName = await symDecrypt(
          symKey.toString("base64"),
          response.body.first_name
        );
        expect(firstName.toString("utf-8")).toEqual(user.profile.first_name);
      }
    }
  });
  it("Updates Profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const { data: profileSymKey } = await aesDecrypt(
          user.encryption_key,
          user.encryption_mac,
          user.keys.profileSymKey
        );
        const profile_picture = await symEncrypt(
          profileSymKey.toString("base64"),
          generateImage(500, 500, 80)
        );
        const response = await request(app)
          .put("/api/account/profile")
          .send({
            profile_picture: profile_picture,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.first_name).toBeTruthy();
        expect(response.body.sym_key).toEqual(user.keys.profileSymKey);
        const { data: symKey } = await aesDecrypt(
          user.encryption_key,
          user.encryption_mac,
          response.body.sym_key
        );
        const firstName = await symDecrypt(
          symKey.toString("base64"),
          response.body.first_name
        );
        expect(firstName.toString("utf-8")).toEqual(user.profile.first_name);
      }
    }
  });
  it("Verifies keys route", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/account/keys")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(response.status).toEqual(200);
        expect(response.body.private_key).toEqual(
          users[userIndex].keys.privateKey
        );
      }
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
  it(
    "Enables notification settings",
    async () => {
      const notification_settings = [
        "notification_on_approved",
        "notification_on_followed",
      ];
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          for (const notification_setting of notification_settings) {
            const token = tokenMap[email];
            const response = await request(app)
              .post("/api/settings")
              .send({ action: notification_setting, enabled: true })
              .set({ ...headers, Authorization: `Bearer ${token}` });
            expect(response.status).toEqual(200);
          }
        }
      }
    },
    10 * 1000
  );
  it(
    "Checks notification settings",
    async () => {
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          const token = tokenMap[email];
          const response = await request(app)
            .get("/api/settings")
            .set({ ...headers, Authorization: `Bearer ${token}` });
          expect(response.status).toEqual(200);
          expect(response.body.length).toEqual(2);
          expect(response.body[0].action).toEqual("notification_on_approved");
          expect(response.body[0].enabled).toEqual(true);
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
        users[userIndex].keys.groupSymKey = symKey;
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
        expect(users[userIndex].keys.groupSymKey).toBeTruthy();
        const encryptedSymKey = response.body[0].sym_key;
        const symKeyData = await aesDecrypt(
          users[userIndex].encryption_key,
          users[userIndex].encryption_mac,
          encryptedSymKey
        );
        expect(symKeyData.isVerified).toEqual(true);
        if (symKeyData.isVerified) {
          expect(symKeyData.data.toString("base64")).toEqual(
            users[userIndex].keys.groupSymKey
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
    const encrypted_sym_key = await rsaEncrypt(
      user2.keys.publicKey,
      Buffer.from(user1.keys.profileSymKey, "base64")
    );
    const response = await request(app)
      .post("/api/follow")
      .set({ ...headers, Authorization: `Bearer ${token1}` })
      .send({
        followee_username: user2.credentials.username,
        sym_key: encrypted_sym_key,
      });
    expect(response.status).toEqual(200);
    expect(response.body.is_approved).toEqual(false);
  });
  it("Check notification for follow", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/notifications")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].content).toEqual(
      `${user1.credentials.username} asked to follow you`
    );
    expect(response.body[0].payload.username).toEqual(
      user1.credentials.username
    );
  });
  it("Check approvals and Approve users", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/follow/approvals")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.total).toEqual(1);
    expect(response.body.data[0].follower_id).toEqual(user1.id);
    const publicKey = response.body.data[0].public_key;
    const groupSymKey = user2.keys.groupSymKey;
    const groupSymKeyEncrypted = await rsaEncrypt(
      publicKey,
      Buffer.from(groupSymKey, "base64")
    );
    const userSymKey = await aesDecrypt(
      user2.encryption_key,
      user2.encryption_mac,
      user2.keys.profileSymKey
    );
    const userSymKeyEncrypted = await rsaEncrypt(publicKey, userSymKey.data);
    const resp = await request(app)
      .post("/api/follow/approve")
      .set({ ...headers, Authorization: `Bearer ${token2}` })
      .send({
        follow_id: response.body.data[0].id,
        group_sym_key: groupSymKeyEncrypted,
        followee_sym_key: userSymKeyEncrypted,
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
    expect(response.body.total).toEqual(1);
    expect(response.body.data[0].user_id).toEqual(user1.id);
  });
  it("Check followees", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/follow/followees")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.total).toEqual(1);
    expect(response.body.data[0].user_id).toEqual(user2.id);
  });
  it("Check notification for approved", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/notifications")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].content).toEqual(
      `${user2.credentials.username} has approved your follow request`
    );
    expect(response.body[0].payload.username).toEqual(
      user2.credentials.username
    );
  });
  it("Create new post", async () => {
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const data = "My First Post";
    const encrypted = await symEncrypt(
      user2.keys.groupSymKey,
      Buffer.from(data)
    );
    const response = await request(app)
      .post("/api/post")
      .send({ group_id: user2.groups[0].id, text_content: encrypted })
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.text_content).toEqual(encrypted);
  });
  it("Fetches user info", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get(`/api/user/${user2.credentials.username}`)
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.username).toEqual(user2.credentials.username);
  });
  it("Fetches user posts", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get(`/api/user/${user2.credentials.username}/posts`)
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.posts.length).toEqual(1);
    const body: PostsFeedResponse = response.body;
    const posts: Array<PostResponse> = body.posts;
    const keys = body.keys;
    const userresponse = body.users;
    expect(userresponse[posts[0].user_id].username).toEqual(
      user2.credentials.username
    );
    const group_sym_key_encrypted = keys[posts[0].key_id];
    const priv_key = await aesDecrypt(
      user1.encryption_key,
      user1.encryption_mac,
      user1.keys.privateKey
    );
    const groupsymkey = await rsaDecrypt(
      priv_key.data.toString("base64"),
      group_sym_key_encrypted
    );
    const text_content = await symDecrypt(
      groupsymkey.toString("base64"),
      posts[0].text_content
    );
    expect(text_content.toString("utf-8")).toEqual("My First Post");
    const firstNameEncrypted = userresponse[posts[0].user_id].first_name;
    const user_sym_key_encrypted = userresponse[posts[0].user_id].sym_key;
    const userSymKey = await rsaDecrypt(
      priv_key.data.toString("base64"),
      user_sym_key_encrypted
    );
    const profileSymKey = await aesDecrypt(
      user2.encryption_key,
      user2.encryption_mac,
      user2.keys.profileSymKey
    );
    // console.log(firstNameEncrypted);
    expect(userSymKey.toString("base64")).toEqual(
      profileSymKey.data.toString("base64")
    );
    const firstName = await symDecrypt(
      userSymKey.toString("base64"),
      firstNameEncrypted
    );
    expect(firstName.toString("utf-8")).toEqual(user2.profile.first_name);
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
  it("Checks count", async () => {
    const include_fields = [
      "notifications",
      "settings",
      "groups",
      "followers",
      "followees",
      "approvals",
      "posts",
    ];
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get(`/api/account/count?include_fields=${include_fields.join(",")}`)
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.notifications).toEqual(1);
        expect(response.body.settings).toEqual(2);
        expect(response.body.groups).toEqual(0);
        expect(response.body.followers).toEqual(0);
        expect(response.body.followees).toEqual(0);
        expect(response.body.approvals).toEqual(0);
        expect(response.body.posts).toEqual(0);
      }
    }
  });
  afterAll(async () => {
    for await (const user of users) {
      await deleteUser(user);
    }
  });
});
