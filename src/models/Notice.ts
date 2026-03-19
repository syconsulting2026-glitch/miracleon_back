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
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { NoticeAttachment } from "./NoticeAttachment";

export class Notice extends Model<
  InferAttributes<Notice, { omit: "attachments" }>,
  InferCreationAttributes<Notice, { omit: "attachments" }>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare views: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare attachments?: NonAttribute<NoticeAttachment[]>;

  declare getAttachments: HasManyGetAssociationsMixin<NoticeAttachment>;
  declare createAttachment: HasManyCreateAssociationMixin<NoticeAttachment>;
  declare addAttachment: HasManyAddAssociationMixin<NoticeAttachment, number>;

  static associate() {
    Notice.hasMany(NoticeAttachment, {
      foreignKey: "noticeId",
      as: "attachments",
      onDelete: "CASCADE",
      hooks: true,
    });
  }
}

Notice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "공지사항 ID",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "공지사항 제목",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "공지사항 내용",
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
    tableName: "notices",
    timestamps: true,
    underscored: true,
    comment: "공지사항",
    indexes: [
      { name: "idx_notices_created_at", fields: ["created_at"] },
      { name: "idx_notices_views", fields: ["views"] },
      { name: "idx_notices_title", fields: ["title"] },
    ],
  }
);