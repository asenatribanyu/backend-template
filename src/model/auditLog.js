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
      type: {
        type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE", "EVENT"),
        allowNull: false,
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
      beforeData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      afterData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      changedFields: {
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
