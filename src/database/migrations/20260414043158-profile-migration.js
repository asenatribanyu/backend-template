"use strict";

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("profiles", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      avatar_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      gender: {
        type: Sequelize.ENUM("male", "female"),
        allowNull: true,
      },

      address: {
        type: Sequelize.STRING,
        allowNull: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("profiles");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_profiles_gender";');
  },
};
