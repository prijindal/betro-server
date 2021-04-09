import { generateServerHash, verifyServerHash } from "../src/util/crypto";

it("should have proper hash funcitons", () => {
  const master_hash =
    "JHBia2RmMi1zaGEyNTYkMSRjR0Z6YzNkdmNtUXhNak0kckJwcm1XblVUcC9SelZnM1VVUk02Rno5eDVFeWhxY0xvWGtLZC81Z2Vndw==";
  const serverHash = generateServerHash(master_hash);

  const isValid = verifyServerHash(master_hash, serverHash);

  expect(isValid).toStrictEqual(true);
});
