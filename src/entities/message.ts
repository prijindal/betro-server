import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  conversation_id: string;

  @Column()
  sender_id: string;

  @Column()
  message: string;

  @CreateDateColumn()
  created_at: Date;
}
