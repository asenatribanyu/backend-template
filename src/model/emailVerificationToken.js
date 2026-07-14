import { DataTypes } from "sequelize";
import { v7 as uuidv7 } from "uuid";

export default (sequelize) => {
  const EmailVerificationToken = sequelize.define(
    "EmailVerificationToken",
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
      tableName: "email_verification_tokens",
      timestamps: true,
      underscored: true,
    },
  );

  EmailVerificationToken.associate = (models) => {
    EmailVerificationToken.belongsTo(models.User, { foreignKey: "userId" });
  };

  return EmailVerificationToken;
};
