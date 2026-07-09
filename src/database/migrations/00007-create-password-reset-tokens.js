"use strict";

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("password_reset_tokens", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      token_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("password_reset_tokens", ["user_id"]);
    await queryInterface.addIndex("password_reset_tokens", ["token_hash"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("password_reset_tokens");
  },
};
