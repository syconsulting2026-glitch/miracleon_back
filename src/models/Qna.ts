import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  HasOneGetAssociationMixin,
  HasOneCreateAssociationMixin,
} from "sequelize";
import { sequelize } from "../db/sequelize";
import { QnaAnswer } from "./QnaAnswer";

export class Qna extends Model<
  InferAttributes<Qna, { omit: "answer" }>,
  InferCreationAttributes<Qna, { omit: "answer" }>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare authorName: string;
  declare password: string;
  declare isSecret: CreationOptional<boolean>;
  declare views: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare answer?: NonAttribute<QnaAnswer | null>;

  declare getAnswer: HasOneGetAssociationMixin<QnaAnswer>;
  declare createAnswer: HasOneCreateAssociationMixin<QnaAnswer>;

  static associate() {
    Qna.hasOne(QnaAnswer, {
      foreignKey: "qnaId",
      as: "answer",
      onDelete: "CASCADE",
      hooks: true,
    });
  }
}

Qna.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "Q&A ID",
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "질문 제목",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "질문 내용",
    },
    authorName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "author_name",
      comment: "작성자명",
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "글 비밀번호",
    },
    isSecret: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_secret",
      comment: "비밀글 여부",
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
    tableName: "qnas",
    timestamps: true,
    underscored: true,
    comment: "Q&A 질문",
    indexes: [
      { name: "idx_qnas_created_at", fields: ["created_at"] },
      { name: "idx_qnas_title", fields: ["title"] },
      { name: "idx_qnas_author_name", fields: ["author_name"] },
      { name: "idx_qnas_is_secret", fields: ["is_secret"] },
    ],
  }
);