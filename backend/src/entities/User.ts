import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Unique,
  Index,
} from "typeorm";
import { GroupMembership } from "./GroupMembership";

/**
 * A user authenticates via OAuth or local password.
 * Users no longer own expenses or categories directly — those belong to groups.
 * A user's access is expressed through GroupMembership records.
 */
@Entity("users")
@Unique("UQ_users_provider_provider_id", ["provider", "providerId"])
@Index("UX_users_email", ["email"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** OAuth provider name, e.g. "google", "facebook", "local". */
  @Column({ type: "varchar" })
  provider!: string;

  /** The user's unique id at the OAuth provider, or the email for local auth. */
  @Column({ name: "provider_id", type: "varchar" })
  providerId!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ name: "avatar_url", type: "varchar", nullable: true })
  avatarUrl!: string | null;

  /** Hashed password for local password auth; null when using OAuth-only. */
  @Column({ name: "password_hash", type: "varchar", nullable: true })
  passwordHash!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => GroupMembership, (membership) => membership.user)
  memberships!: GroupMembership[];
}
