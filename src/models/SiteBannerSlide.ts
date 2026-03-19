import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { SiteBanner } from "./SiteBanner";

export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";

export class SiteBannerSlide extends Model<
  InferAttributes<SiteBannerSlide, { omit: "banner" }>,
  InferCreationAttributes<SiteBannerSlide, { omit: "banner" }>
> {
  declare id: CreationOptional<number>;
  declare bannerId: ForeignKey<SiteBanner["id"]>;
  declare sortOrder: number;

  declare title: string | null;
  declare description: string | null;

  declare imageUrl: string | null;
  declare imageName: string | null;

  declare fontSize: number;
  declare fontColor: string;
  declare fontFamily: string;

  declare textAlign: TextAlign;
  declare verticalAlign: VerticalAlign;

  declare duration: number;
  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // association
  declare banner?: NonAttribute<SiteBanner>;

  declare getBanner: BelongsToGetAssociationMixin<SiteBanner>;
  declare setBanner: BelongsToSetAssociationMixin<SiteBanner, number>;
  declare createBanner: BelongsToCreateAssociationMixin<SiteBanner>;

  static associate() {
    SiteBannerSlide.belongsTo(SiteBanner, {
      foreignKey: "bannerId",
      targetKey: "id",
      as: "banner",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  }
}

SiteBannerSlide.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "배너 슬라이드 ID",
    },
    bannerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "banner_id",
      comment: "배너 ID",
      references: {
        model: "site_banners",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: "sort_order",
      comment: "정렬 순서",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "슬라이드 제목",
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "슬라이드 설명",
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "image_url",
      comment: "이미지 URL",
    },
    imageName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "image_name",
      comment: "이미지 파일명",
    },
    fontSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 48,
      field: "font_size",
      comment: "폰트 크기",
    },
    fontColor: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "#ffffff",
      field: "font_color",
      comment: "폰트 색상",
    },
    fontFamily: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Pretendard",
      field: "font_family",
      comment: "폰트명",
    },
    textAlign: {
      type: DataTypes.ENUM("left", "center", "right"),
      allowNull: false,
      defaultValue: "center",
      field: "text_align",
      comment: "가로 정렬",
    },
    verticalAlign: {
      type: DataTypes.ENUM("top", "center", "bottom"),
      allowNull: false,
      defaultValue: "center",
      field: "vertical_align",
      comment: "세로 정렬",
    },
    duration: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 5,
      comment: "표시 시간(초)",
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
    tableName: "site_banner_slides",
    timestamps: true,
    underscored: true,
    comment: "사이트 배너 슬라이드",
    indexes: [
      { name: "idx_site_banner_slides_banner_id", fields: ["banner_id"] },
      { name: "idx_site_banner_slides_sort_order", fields: ["sort_order"] },
      {
        name: "idx_site_banner_slides_banner_sort",
        fields: ["banner_id", "sort_order"],
      },
      { name: "idx_site_banner_slides_is_active", fields: ["is_active"] },
      { name: "idx_site_banner_slides_created_at", fields: ["created_at"] },
    ],
  }
);