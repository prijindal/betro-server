export type RegisterBody = {
  username: string;
  email: string;
  master_hash: string;
  inhibit_login: boolean;
  sym_key: string;
  device_id: string;
  initial_device_display_name: string;
};
