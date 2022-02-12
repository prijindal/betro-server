import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("group_follow_approvals")
export class GroupFollowApproval {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column()
  followee_id: string;

  @Column({ nullable: true })
  encrypted_sym_key: string;

  @Column({ nullable: true })
  user_key_id: string;

  @Column({ nullable: true })
  followee_key_id: string;

  @Column({ nullable: true })
  group_id: string;

  @Column({ default: false })
  is_approved: boolean;

  @CreateDateColumn()
  created_at: Date;
}
