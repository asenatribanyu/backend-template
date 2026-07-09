"use strict";

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("role_permissions", {
      role_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "roles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "permissions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    await queryInterface.addIndex("role_permissions", ["role_id"]);
    await queryInterface.addIndex("role_permissions", ["permission_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("role_permissions");
  },
};
