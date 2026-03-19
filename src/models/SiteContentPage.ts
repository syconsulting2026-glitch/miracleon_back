import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyCreateAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { SiteContentSection } from "./SiteContentSection";

export type ContentCategory =
  | "UNBOX소개"
  | "설립목적"
  | "주요사업"
  | "철학가치관";

export class SiteContentPage extends Model<
  InferAttributes<SiteContentPage, { omit: "sections" }>,
  InferCreationAttributes<SiteContentPage, { omit: "sections" }>
> {
  declare id: CreationOptional<number>;
  declare category: ContentCategory;
  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // association
  declare sections?: NonAttribute<SiteContentSection[]>;

  declare getSections: HasManyGetAssociationsMixin<SiteContentSection>;
  declare setSections: HasManySetAssociationsMixin<SiteContentSection, number>;
  declare addSection: HasManyAddAssociationMixin<SiteContentSection, number>;
  declare createSection: HasManyCreateAssociationMixin<SiteContentSection>;

  static associate() {
    SiteContentPage.hasMany(SiteContentSection, {
      foreignKey: "pageId",
      sourceKey: "id",
      as: "sections",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  }
}

SiteContentPage.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "내용관리 페이지 ID",
    },
    category: {
      type: DataTypes.ENUM("UNBOX소개", "설립목적", "주요사업", "철학가치관"),
      allowNull: false,
      unique: true,
      comment: "콘텐츠 카테고리",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
      comment: "사용 여부",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "생성일",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "수정일",
    },
  },
  {
    sequelize,
    tableName: "site_content_pages",
    timestamps: true,
    underscored: true,
    comment: "사이트 내용관리 페이지",
    indexes: [
      { name: "uk_site_content_pages_category", unique: true, fields: ["category"] },
      { name: "idx_site_content_pages_is_active", fields: ["is_active"] },
      { name: "idx_site_content_pages_created_at", fields: ["created_at"] },
    ],
  }
);