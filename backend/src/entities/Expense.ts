import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Group } from "./Group";
import { User } from "./User";
import { Category } from "./Category";

export type ExpenseSource = "voice" | "manual";

/**
 * An expense belongs to a group (tenant boundary). It records which user
 * created it via created_by for audit purposes, but ownership/access is
 * governed by the group. All expense queries must be scoped by group_id.
 */
@Entity("expenses")
@Index("IDX_expenses_group_id", ["groupId"])
export class Expense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "group_id", type: "uuid" })
  groupId!: string;

  @ManyToOne(() => Group, (group) => group.expenses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_id" })
  group!: Group;

  /** Auditing reference to the user who created the expense. Non-nullable. */
  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "created_by" })
  creator!: User;

  @Column({ name: "category_id", type: "uuid", nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, (category) => category.expenses, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "category_id" })
  category!: Category | null;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true })
  cost!: string | null;

  @Column({ type: "boolean", default: true })
  pending!: boolean;

  @Column({ type: "enum", enum: ["voice", "manual"] })
  source!: ExpenseSource;

  @Column({ name: "original_transcript", type: "text", nullable: true })
  originalTranscript!: string | null;

  @Column({ type: "date" })
  date!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
