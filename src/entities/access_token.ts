import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("access_tokens")
export class AccessToken {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column({ unique: true })
  access_token_hash: string;

  @Column({ unique: true })
  device_id: string;

  @Column()
  device_display_name: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  accessed_at: Date;
}
