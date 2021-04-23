export interface RsaKeyPostgres {
  id: string;
  public_key: string;
  private_key?: string;
}
