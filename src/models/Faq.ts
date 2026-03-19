import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export class Faq extends Model<
  InferAttributes<Faq>,
  InferCreationAttributes<Faq>
> {
  declare id: CreationOptional<number>;
  declare category: string;
  declare question: string;
  declare answer: string;
  declare isPinned: CreationOptional<boolean>;
  declare isVisible: CreationOptional<boolean>;
  declare views: CreationOptional<number>;
  declare sortOrder: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {}
}

Faq.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "FAQ ID",
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "기타",
      comment: "FAQ 카테고리",
    },
    question: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "질문",
    },
    answer: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "답변",
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_pinned",
      comment: "상단 고정 여부",
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_visible",
      comment: "노출 여부",
    },
    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "조회수",
    },
    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
      comment: "정렬 순서",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
      comment: "생성일",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
      comment: "수정일",
    },
  },
  {
    sequelize,
    tableName: "faqs",
    timestamps: true,
    underscored: true,
    comment: "FAQ",
    indexes: [
      { name: "idx_faqs_sort_order", fields: ["sort_order"] },
      { name: "idx_faqs_is_visible", fields: ["is_visible"] },
      { name: "idx_faqs_is_pinned", fields: ["is_pinned"] },
      { name: "idx_faqs_category", fields: ["category"] },
      { name: "idx_faqs_created_at", fields: ["created_at"] },
    ],
  }
);