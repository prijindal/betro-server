import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
} from "typeorm";

export enum UserNotificationsActions {
  notification_on_approved = "notification_on_approved",
  notification_on_followed = "notification_on_followed",
}

@Entity("user_notifications")
export class UserNotification {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column("text")
  action: UserNotificationsActions;

  @Column({ default: false })
  read: boolean;

  @Column()
  content: string;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
