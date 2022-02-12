import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

@Entity("user_sym_keys")
export class UserSymKey {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  sym_key: string;
}
