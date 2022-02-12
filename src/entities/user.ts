import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column({ unique: true })
  master_hash: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  sym_key_id: string;
}
