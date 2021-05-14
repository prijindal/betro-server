// profile_grants

export interface ProfileGrantPostgres {
  id: string;
  user_id: string;
  grantee_id: string;
  user_key_id?: string;
  grantee_key_id?: string;
  user_profile_id?: string;
  encrypted_sym_key?: string;
  granted: boolean;
}
