import { DataTypes } from "sequelize";

export default {
  async up(queryInterface) {
    await queryInterface.createTable("email_verification_tokens", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      token_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex("email_verification_tokens", ["user_id"]);
    await queryInterface.addIndex("email_verification_tokens", ["token_hash"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("email_verification_tokens");
  },
};
