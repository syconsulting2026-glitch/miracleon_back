import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { GalleryImage } from "./GalleryImage";

export class Gallery extends Model<
  InferAttributes<Gallery, { omit: "images" }>,
  InferCreationAttributes<Gallery, { omit: "images" }>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string | null;
  declare views: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare images?: NonAttribute<GalleryImage[]>;

  declare getImages: HasManyGetAssociationsMixin<GalleryImage>;
  declare createImage: HasManyCreateAssociationMixin<GalleryImage>;

  static associate() {
    Gallery.hasMany(GalleryImage, {
      foreignKey: "galleryId",
      as: "images",
      onDelete: "CASCADE",
      hooks: true,
    });
  }
}

Gallery.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "갤러리 ID",
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "갤러리 제목",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "설명",
    },

    views: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "조회수",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "galleries",
    timestamps: true,
    underscored: true,
    comment: "활동 갤러리",
    indexes: [
      { name: "idx_galleries_created_at", fields: ["created_at"] },
      { name: "idx_galleries_title", fields: ["title"] },
    ],
  }
);