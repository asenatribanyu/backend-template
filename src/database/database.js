import config from "../config/config.js";
import Sequelize from "sequelize";

const isProduction = config.app.env === "PRODUCTION";

const db = new Sequelize({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  dialect: config.db.dialect,
  logging: false,
  minifyAliases: true,
  pool: {
    max: isProduction ? 20 : 5,
    min: isProduction ? 5 : 1,
    acquire: 30000,
    idle: 10000,
  },
});

export default db;
