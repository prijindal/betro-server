import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column()
  group_id: string;

  @Column()
  key_id: string;

  @Column({ nullable: true })
  text_content: string;

  @Column({ nullable: true })
  media_content: string;

  @Column({ nullable: true })
  media_encoding: string;

  @CreateDateColumn()
  created_at: Date;
}
