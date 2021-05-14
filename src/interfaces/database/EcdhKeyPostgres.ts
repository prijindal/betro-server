// user_echd_keys

export interface EcdhKeyPostgres {
  id: string;
  user_id: string;
  public_key: string;
  private_key: string;
  claimed: boolean;
}
