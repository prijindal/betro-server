import { connection } from "./connection";

connection({
  synchronize: true,
  dropSchema: true,
  cache: false,
});
