"use strict";

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_audit_logs_type\" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'EVENT');",
    );
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_audit_logs_actor_type\" AS ENUM('USER', 'SYSTEM', 'GUEST', 'ADMIN');",
    );

    await queryInterface.createTable("audit_logs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      type: {
        type: '"enum_audit_logs_type"',
        allowNull: false,
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      actor_type: {
        type: '"enum_audit_logs_actor_type"',
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      before_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      after_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      changed_fields: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      message: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex("audit_logs", ["actor_id"]);
    await queryInterface.addIndex("audit_logs", ["entity_type", "entity_id"]);
    await queryInterface.addIndex("audit_logs", ["action"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_audit_logs_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_audit_logs_actor_type";');
  },
};
