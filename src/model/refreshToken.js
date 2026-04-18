import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv7(),
      },
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      deviceInfo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      replacedByToken: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "refresh_tokens",
      timestamps: true,
      underscored: true,
    },
  );
  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: "userId" });
    RefreshToken.belongsTo(models.RefreshToken, {
      as: "replacedBy",
      foreignKey: "replacedByToken",
    });
  };
  return RefreshToken;
};
