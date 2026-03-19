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
import { Qna } from "./Qna";

export class QnaAnswer extends Model<
  InferAttributes<QnaAnswer, { omit: "qna" }>,
  InferCreationAttributes<QnaAnswer, { omit: "qna" }>
> {
  declare id: CreationOptional<number>;
  declare qnaId: ForeignKey<Qna["id"]>;
  declare content: string;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare qna?: NonAttribute<Qna>;
  declare getQna: BelongsToGetAssociationMixin<Qna>;

  static associate() {
    QnaAnswer.belongsTo(Qna, {
      foreignKey: "qnaId",
      as: "qna",
    });
  }
}

QnaAnswer.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "Q&A 답변 ID",
    },
    qnaId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "qna_id",
      references: {
        model: "qnas",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      comment: "질문 ID",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "답변 내용",
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
    tableName: "qna_answers",
    timestamps: true,
    underscored: true,
    comment: "Q&A 답변",
    indexes: [
      { name: "idx_qna_answers_qna_id", fields: ["qna_id"], unique: true },
      { name: "idx_qna_answers_created_at", fields: ["created_at"] },
    ],
  }
);