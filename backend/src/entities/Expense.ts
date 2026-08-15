import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Category } from "./Category";

export type ExpenseSource = "voice" | "manual";

@Entity("expenses")
export class Expense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.expenses, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

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
