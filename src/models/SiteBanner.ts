import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyAddAssociationMixin,
  HasManySetAssociationsMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { SiteBannerSlide } from "./SiteBannerSlide";

export type BannerCategory =
  | "메인"
  | "미라클온소개"
  | "설립목적"
  | "주요사업"
  | "철학가치관"
  | "커뮤니티";

export type BannerEffect =
  | "slide"
  | "fade"
  | "coverflow"
  | "flip"
  | "cards"
  | "creative";

export class SiteBanner extends Model<
  InferAttributes<SiteBanner, { omit: "slides" }>,
  InferCreationAttributes<SiteBanner, { omit: "slides" }>
> {
  declare id: CreationOptional<number>;
  declare category: BannerCategory;
  declare effect: BannerEffect;
  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // association
  declare slides?: NonAttribute<SiteBannerSlide[]>;

  declare getSlides: HasManyGetAssociationsMixin<SiteBannerSlide>;
  declare createSlide: HasManyCreateAssociationMixin<SiteBannerSlide>;
  declare addSlide: HasManyAddAssociationMixin<SiteBannerSlide, number>;
  declare setSlides: HasManySetAssociationsMixin<SiteBannerSlide, number>;

  static associate() {
    SiteBanner.hasMany(SiteBannerSlide, {
      foreignKey: "bannerId",
      sourceKey: "id",
      as: "slides",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  }
}

SiteBanner.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "배너 ID",
    },
    category: {
      type: DataTypes.ENUM(
        "메인", 
        "미라클온소개",
        "설립목적",
        "주요사업",
        "철학가치관",
        "커뮤니티"
      ),
      allowNull: false,
      unique: false,
      comment: "배너 카테고리",
    },
    effect: {
      type: DataTypes.ENUM(
        "slide",
        "fade",
        "coverflow",
        "flip",
        "cards",
        "creative"
      ),
      allowNull: false,
      defaultValue: "slide",
      comment: "배너 효과",
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
    tableName: "site_banners",
    timestamps: true,
    underscored: true,
    comment: "사이트 카테고리별 배너 설정",
    indexes: [
      { name: "uk_site_banners_category", unique: true, fields: ["category"] },
      { name: "idx_site_banners_is_active", fields: ["is_active"] },
      { name: "idx_site_banners_created_at", fields: ["created_at"] },
    ],
  }
);