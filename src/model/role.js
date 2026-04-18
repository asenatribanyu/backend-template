import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const Role = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    },
  );

  Role.associate = (models) => {
    Role.hasMany(models.User, { foreignKey: "roleId" });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "roleId",
    });
  };

  return Role;
};
