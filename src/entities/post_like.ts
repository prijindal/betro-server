import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("post_likes")
export class PostLike {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column()
  post_id: string;

  @CreateDateColumn()
  created_at: boolean;
}
