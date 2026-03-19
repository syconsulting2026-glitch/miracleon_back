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
import { Notice } from "./Notice";

export class NoticeAttachment extends Model<
  InferAttributes<NoticeAttachment, { omit: "notice" }>,
  InferCreationAttributes<NoticeAttachment, { omit: "notice" }>
> {
  declare id: CreationOptional<number>;
  declare noticeId: ForeignKey<Notice["id"]>;

  declare originalName: string;
  declare storedName: string;
  declare filePath: string;
  declare fileUrl: string | null;
  declare mimeType: string | null;
  declare fileSize: number | null;
  declare fileType: "image" | "file";
  declare sortOrder: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare notice?: NonAttribute<Notice>;
  declare getNotice: BelongsToGetAssociationMixin<Notice>;

  static associate() {
    NoticeAttachment.belongsTo(Notice, {
      foreignKey: "noticeId",
      as: "notice",
    });
  }
}

NoticeAttachment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "첨부파일 ID",
    },
    noticeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "notice_id",
      comment: "공지사항 ID",
      references: {
        model: "notices",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "original_name",
      comment: "원본 파일명",
    },
    storedName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "stored_name",
      comment: "서버 저장 파일명",
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "file_path",
      comment: "서버 저장 경로",
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "file_url",
      comment: "클라이언트 접근 URL",
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "mime_type",
      comment: "MIME 타입",
    },
    fileSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "file_size",
      comment: "파일 크기(byte)",
    },
    fileType: {
      type: DataTypes.ENUM("image", "file"),
      allowNull: false,
      defaultValue: "file",
      field: "file_type",
      comment: "첨부 유형(image/file)",
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
    tableName: "notice_attachments",
    timestamps: true,
    underscored: true,
    comment: "공지사항 첨부파일",
    indexes: [
      { name: "idx_notice_attachments_notice_id", fields: ["notice_id"] },
      { name: "idx_notice_attachments_file_type", fields: ["file_type"] },
      { name: "idx_notice_attachments_sort_order", fields: ["sort_order"] },
    ],
  }
);