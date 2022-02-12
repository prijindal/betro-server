import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

export enum UserSettingsType {
  notification_on_approved = "notification_on_approved",
  notification_on_followed = "notification_on_followed",
  allow_search = "allow_search",
}

@Entity("user_settings")
export class UserSettings {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column("text")
  type: UserSettingsType;

  @Column()
  enabled: boolean;
}
