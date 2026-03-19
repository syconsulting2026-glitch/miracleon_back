import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db/sequelize";

export type ApplyClassType = ""|"AI" | "CODING";
export type ApplyStatus = ""|"NEW" | "CONTACTED" | "DONE" | "CANCELLED";

export class Apply extends Model<
  InferAttributes<Apply>,
  InferCreationAttributes<Apply>
> {
  declare id: CreationOptional<number>;
  declare classType: ApplyClassType;
  declare name: string;
  declare phone: string;
  declare phoneDigits: string;
  declare district: string;
  declare neighborhoodDetail: string;
  declare address: string;
  declare motivation: string;
  declare howFound: string;
  declare recommender: CreationOptional<string | null>;
  declare privacyAgree: boolean;
  declare status: CreationOptional<ApplyStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static associate() {}
}

Apply.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      comment: "수강신청 ID",
    },
    classType: {
      type: DataTypes.ENUM("AI", "CODING"),
      allowNull: false,
      field: "class_type",
      comment: "수업 종류",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "이름",
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: "연락처 원본",
    },
    phoneDigits: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "phone_digits",
      comment: "숫자만 연락처",
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "구/군",
    },
    neighborhoodDetail: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "neighborhood_detail",
      comment: "동/읍/면 상세",
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "전체 주소",
    },
    motivation: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "지원동기",
    },
    howFound: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "how_found",
      comment: "알게 된 계기",
    },
    recommender: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: "추천인",
    },
    privacyAgree: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "privacy_agree",
      comment: "개인정보 동의 여부",
    },
    status: {
      type: DataTypes.ENUM("NEW", "CONTACTED", "DONE", "CANCELLED"),
      allowNull: false,
      defaultValue: "NEW",
      comment: "처리 상태",
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
    tableName: "applys",
    timestamps: true,
    underscored: true,
    comment: "수강신청",
    indexes: [
      { name: "idx_applys_created_at", fields: ["created_at"] },
      { name: "idx_applys_status", fields: ["status"] },
      { name: "idx_applys_class_type", fields: ["class_type"] },
      { name: "idx_applys_name", fields: ["name"] },
      { name: "idx_applys_phone_digits", fields: ["phone_digits"] },
      { name: "idx_applys_district", fields: ["district"] },
    ],
  }
);