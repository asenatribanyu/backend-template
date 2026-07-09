import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isBlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["role_id"],
        },
      ],
    },
  );
  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: "roleId" });
    User.hasOne(models.Profile, { foreignKey: "userId" });
    User.hasMany(models.RefreshToken, { foreignKey: "userId" });
    User.hasMany(models.AuditLog, { foreignKey: "actorId" });
  };

  return User;
};
