const Sequelize = require('sequelize')
const sequelize = require('../service/database')

const ItemLog = sequelize.define('item_logs', {
  id: { field: 'id', type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  item_id: { field: 'item_id', type: Sequelize.INTEGER },
  data_product_id: { field: 'data_product_id', type: Sequelize.INTEGER, allowNull: true },
  like: { field: 'like', type: Sequelize.INTEGER },
  createdAt: { field: 'created_at', type: Sequelize.DATE, },
  updatedAt: { field: 'updated_at', type: Sequelize.DATE, }
});

module.exports = ItemLog