import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  sender_id: string;

  @Column()
  receiver_id: string;

  @Column()
  sender_key_id: string;

  @Column()
  receiver_key_id: string;

  @CreateDateColumn()
  created_at: Date;
}
