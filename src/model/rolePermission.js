import { DataTypes } from "sequelize";

export default (sequelize) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      roleId: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      permissionId: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
    },
    {
      tableName: "role_permissions",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["role_id", "permission_id"],
        },
        {
          fields: ["role_id"],
        },
        {
          fields: ["permission_id"],
        },
      ],
    },
  );
  return RolePermission;
};
