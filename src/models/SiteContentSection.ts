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
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyCreateAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { SiteContentPage } from "./SiteContentPage";
import { SiteContentSectionCardItem } from "./SiteContentSectionCardItem";

export type SectionType =
  | "text"
  | "imageText"
  | "cta"
  | "titleImage"
  | "cardGrid";

export type TextAlign = "left" | "center" | "right";
export type AnimationType =
  | "none"
  | "fadeUp"
  | "fadeIn"
  | "slideLeft"
  | "slideRight"
  | "zoomIn";

export type SectionBackground = "white" | "gray" | "dark";
export type ImageLayout = "left" | "right";
export type CtaTheme = "orange" | "dark";

export class SiteContentSection extends Model<
  InferAttributes<SiteContentSection, { omit: "page" | "cardItems" }>,
  InferCreationAttributes<SiteContentSection, { omit: "page" | "cardItems" }>
> {
  declare id: CreationOptional<number>;
  declare pageId: ForeignKey<SiteContentPage["id"]>;
  declare sortOrder: number;

  declare sectionType: SectionType;
  declare name: string;
  declare animation: AnimationType;

  declare eyebrow: string | null;
  declare title: string | null;
  declare description: string | null;

  declare titleColor: string | null;
  declare descriptionColor: string | null;

  declare align: TextAlign | null;
  declare background: SectionBackground | null;

  declare imageUrl: string | null;
  declare imageName: string | null;
  declare layout: ImageLayout | null;

  declare buttonText: string | null;
  declare buttonLink: string | null;
  declare buttonTextColor: string | null;
  declare buttonBgColor: string | null;

  declare theme: CtaTheme | null;

  declare pcColumns: number | null;
  declare tabletColumns: number | null;
  declare mobileColumns: number | null;

  declare rowGap: number | null;
  declare columnGap: number | null;

  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // association
  declare page?: NonAttribute<SiteContentPage>;
  declare cardItems?: NonAttribute<SiteContentSectionCardItem[]>;

  declare getPage: BelongsToGetAssociationMixin<SiteContentPage>;
  declare setPage: BelongsToSetAssociationMixin<SiteContentPage, number>;
  declare createPage: BelongsToCreateAssociationMixin<SiteContentPage>;

  declare getCardItems: HasManyGetAssociationsMixin<SiteContentSectionCardItem>;
  declare setCardItems: HasManySetAssociationsMixin<SiteContentSectionCardItem, number>;
  declare addCardItem: HasManyAddAssociationMixin<SiteContentSectionCardItem, number>;
  declare createCardItem: HasManyCreateAssociationMixin<SiteContentSectionCardItem>;

  static associate() {
    SiteContentSection.belongsTo(SiteContentPage, {
      foreignKey: "pageId",
      targetKey: "id",
      as: "page",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    SiteContentSection.hasMany(SiteContentSectionCardItem, {
      foreignKey: "sectionId",
      sourceKey: "id",
      as: "cardItems",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  }
}

SiteContentSection.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "내용관리 섹션 ID",
    },
    pageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "page_id",
      comment: "내용관리 페이지 ID",
      references: {
        model: "site_content_pages",
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
    sectionType: {
      type: DataTypes.ENUM("text", "imageText", "cta", "titleImage", "cardGrid"),
      allowNull: false,
      field: "section_type",
      comment: "섹션 타입",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "관리용 섹션명",
    },
    animation: {
      type: DataTypes.ENUM(
        "none",
        "fadeUp",
        "fadeIn",
        "slideLeft",
        "slideRight",
        "zoomIn"
      ),
      allowNull: false,
      defaultValue: "fadeUp",
      comment: "애니메이션 효과",
    },
    eyebrow: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "상단 소제목",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "섹션 제목",
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "섹션 설명",
    },
    titleColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "title_color",
      comment: "제목 색상",
    },
    descriptionColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "description_color",
      comment: "설명 색상",
    },
    align: {
      type: DataTypes.ENUM("left", "center", "right"),
      allowNull: true,
      comment: "정렬",
    },
    background: {
      type: DataTypes.ENUM("white", "gray", "dark"),
      allowNull: true,
      comment: "배경 타입",
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
    layout: {
      type: DataTypes.ENUM("left", "right"),
      allowNull: true,
      comment: "이미지 위치",
    },
    buttonText: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "button_text",
      comment: "버튼 문구",
    },
    buttonLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "button_link",
      comment: "버튼 링크",
    },
    buttonTextColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "button_text_color",
      comment: "버튼 글자색",
    },
    buttonBgColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "button_bg_color",
      comment: "버튼 배경색",
    },
    theme: {
      type: DataTypes.ENUM("orange", "dark"),
      allowNull: true,
      comment: "CTA 테마",
    },
    pcColumns: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "pc_columns",
      comment: "PC 열 수",
    },
    tabletColumns: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "tablet_columns",
      comment: "태블릿 열 수",
    },
    mobileColumns: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "mobile_columns",
      comment: "모바일 열 수",
    },
    rowGap: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "row_gap",
      comment: "카드 세로 간격",
    },
    columnGap: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "column_gap",
      comment: "카드 가로 간격",
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
    tableName: "site_content_sections",
    timestamps: true,
    underscored: true,
    comment: "사이트 내용관리 섹션",
    indexes: [
      { name: "idx_site_content_sections_page_id", fields: ["page_id"] },
      { name: "idx_site_content_sections_sort_order", fields: ["sort_order"] },
      {
        name: "idx_site_content_sections_page_sort",
        fields: ["page_id", "sort_order"],
      },
      { name: "idx_site_content_sections_section_type", fields: ["section_type"] },
      { name: "idx_site_content_sections_is_active", fields: ["is_active"] },
      { name: "idx_site_content_sections_created_at", fields: ["created_at"] },
    ],
  }
);