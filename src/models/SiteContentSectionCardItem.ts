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
import { SiteContentSection } from "./SiteContentSection";

export class SiteContentSectionCardItem extends Model<
  InferAttributes<SiteContentSectionCardItem, { omit: "section" }>,
  InferCreationAttributes<SiteContentSectionCardItem, { omit: "section" }>
> {
  declare id: CreationOptional<number>;
  declare sectionId: ForeignKey<SiteContentSection["id"]>;
  declare sortOrder: number;

  declare title: string;
  declare description: string | null;

  declare iconUrl: string | null;
  declare iconName: string | null;

  declare titleColor: string | null;
  declare descriptionColor: string | null;
  declare cardBgColor: string | null;

  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // association
  declare section?: NonAttribute<SiteContentSection>;

  declare getSection: BelongsToGetAssociationMixin<SiteContentSection>;
  declare setSection: BelongsToSetAssociationMixin<SiteContentSection, number>;
  declare createSection: BelongsToCreateAssociationMixin<SiteContentSection>;

  static associate() {
    SiteContentSectionCardItem.belongsTo(SiteContentSection, {
      foreignKey: "sectionId",
      targetKey: "id",
      as: "section",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  }
}

SiteContentSectionCardItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "카드 아이템 ID",
    },
    sectionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "section_id",
      comment: "내용관리 섹션 ID",
      references: {
        model: "site_content_sections",
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
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: "카드 제목",
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "카드 설명",
    },
    iconUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "icon_url",
      comment: "아이콘 URL",
    },
    iconName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "icon_name",
      comment: "아이콘 파일명",
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
    cardBgColor: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "card_bg_color",
      comment: "카드 배경색",
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
    tableName: "site_content_section_card_items",
    timestamps: true,
    underscored: true,
    comment: "사이트 내용관리 카드 아이템",
    indexes: [
      { name: "idx_site_content_section_card_items_section_id", fields: ["section_id"] },
      { name: "idx_site_content_section_card_items_sort_order", fields: ["sort_order"] },
      {
        name: "idx_site_content_section_card_items_section_sort",
        fields: ["section_id", "sort_order"],
      },
      { name: "idx_site_content_section_card_items_is_active", fields: ["is_active"] },
      { name: "idx_site_content_section_card_items_created_at", fields: ["created_at"] },
    ],
  }
);