import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

@Entity("profile_grants")
export class ProfileGrant {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  grantee_id: string;

  @Column({ nullable: true })
  user_key_id: string;

  @Column({ nullable: true })
  grantee_key_id: string;

  @Column({ nullable: true })
  user_profile_id: string;

  @Column({ nullable: true })
  encrypted_sym_key: string;

  @Column({ default: false })
  granted: boolean;
}
