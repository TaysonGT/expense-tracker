import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from "typeorm";
import { Group } from "./Group";
import { User } from "./User";

export type GroupRole = "admin" | "viewer";

/**
 * Junction table linking users to groups with a role. A user may belong to
 * many groups, and a group may have many users. The pair [group_id, user_id]
 * is unique — a user has at most one membership per group.
 */
@Entity("group_memberships")
@Unique("UQ_group_memberships_group_user", ["groupId", "userId"])
@Index("IDX_group_memberships_group_user", ["groupId", "userId"])
export class GroupMembership {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "group_id", type: "uuid" })
  groupId!: string;

  @ManyToOne(() => Group, (group) => group.memberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group!: Group;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "enum", enum: ["admin", "viewer"], default: "viewer" })
  role!: GroupRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;
}
