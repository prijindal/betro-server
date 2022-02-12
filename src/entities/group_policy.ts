import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";

@Entity("group_policies")
export class GroupPolicy {
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Column()
  user_id: string;

  @Column()
  key_id: string;

  @Column()
  name: string;

  @Column({ default: false })
  is_default: boolean;
}
