import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { Group } from "./Group";
import { Expense } from "./Expense";

/**
 * Categories belong to a group. A set of "base" categories is cloned into
 * each new group on creation (is_base = true on the clones). Custom
 * categories created within a group have is_base = false.
 */
@Entity("categories")
@Index("IDX_categories_group_id", ["groupId"])
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "group_id", type: "uuid" })
  groupId!: string;

  @ManyToOne(() => Group, (group) => group.categories, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group!: Group;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  color!: string | null;

  @Column({ type: "varchar", nullable: true })
  icon!: string | null;

  /** True for categories seeded from the base set when the group was created. */
  @Column({ name: "is_base", type: "boolean", default: false })
  isBase!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => Expense, (expense) => expense.category)
  expenses!: Expense[];
}
