const { Sequelize } = require('sequelize')
const path = require('path')
const ENV_PATH = path.join(__dirname, '../../.env');
require('dotenv').config({path: ENV_PATH});
// require('dotenv').config()

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  timezone:'+09:00'
});

module.exports = sequelize