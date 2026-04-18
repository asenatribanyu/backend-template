import config from "../config/config.js";
import Sequelize from "sequelize";

const db = new Sequelize({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  dialect: config.db.dialect,
});

export default db;
