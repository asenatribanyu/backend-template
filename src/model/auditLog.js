import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      actorType: {
        type: DataTypes.ENUM("USER", "SYSTEM", "GUEST", "ADMIN"),
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      beforeChange: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      afterChange: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      changeFields: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      underscored: true,
    },
  );
  return AuditLog;
};
