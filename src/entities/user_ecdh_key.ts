import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("user_ecdh_keys")
export class UserEcdhKey {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column()
  public_key: string;

  @Column()
  private_key: string;

  @Column({ default: false })
  claimed: boolean;

  @CreateDateColumn()
  created_at: Date;
}
