import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Category } from "./Category";
import { Expense } from "./Expense";
import { GroupMembership } from "./GroupMembership";

/**
 * A Group is the tenant boundary for the app. Expenses and categories belong
 * to a group, and users participate via GroupMembership (with a role). All
 * data access must be scoped by group_id for tenant isolation.
 */
@Entity("groups")
export class Group {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  /** ISO 4217 currency code used to display amounts in this group. */
  @Column({ type: "varchar", length: 3, default: "USD" })
  currency!: string;

  /** Whether member balances are shown in the group UI. */
  @Column({ name: "show_balance", type: "boolean", default: true })
  showBalance!: boolean;

  /**
   * Unique 8-char alphanumeric code used to join the group. Auto-generated
   * at the DB level (DEFAULT gen_join_code()) but may also be set by the app.
   */
  @Column({ name: "join_code", type: "varchar", length: 8, unique: true })
  joinCode!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => Expense, (expense) => expense.group)
  expenses!: Expense[];

  @OneToMany(() => Category, (category) => category.group)
  categories!: Category[];

  @OneToMany(() => GroupMembership, (membership) => membership.group)
  memberships!: GroupMembership[];
}
