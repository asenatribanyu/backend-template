import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const PasswordResetToken = sequelize.define(
    "PasswordResetToken",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
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
    },
    {
      tableName: "password_reset_tokens",
      timestamps: true,
      underscored: true,
    },
  );
  return PasswordResetToken;
};
