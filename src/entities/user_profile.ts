import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

@Entity("user_profile")
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  profile_picture: string;
}
