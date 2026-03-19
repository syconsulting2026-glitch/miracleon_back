import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  BelongsToGetAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { Gallery } from "./Gallery";

export class GalleryImage extends Model<
  InferAttributes<GalleryImage, { omit: "gallery" }>,
  InferCreationAttributes<GalleryImage, { omit: "gallery" }>
> {
  declare id: CreationOptional<number>;
  declare galleryId: ForeignKey<Gallery["id"]>;

  declare originalName: string;
  declare storedName: string;
  declare filePath: string;
  declare fileUrl: string;

  declare sortOrder: CreationOptional<number>;
  declare isThumbnail: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare gallery?: NonAttribute<Gallery>;
  declare getGallery: BelongsToGetAssociationMixin<Gallery>;

  static associate() {
    GalleryImage.belongsTo(Gallery, {
      foreignKey: "galleryId",
      as: "gallery",
    });
  }
}

GalleryImage.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    galleryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "gallery_id",
      references: {
        model: "galleries",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "original_name",
    },

    storedName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "stored_name",
    },

    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "file_path",
    },

    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "file_url",
    },

    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },

    isThumbnail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_thumbnail",
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
    tableName: "gallery_images",
    timestamps: true,
    underscored: true,
    comment: "갤러리 이미지",
    indexes: [
      { name: "idx_gallery_images_gallery_id", fields: ["gallery_id"] },
      { name: "idx_gallery_images_sort_order", fields: ["sort_order"] },
    ],
  }
);