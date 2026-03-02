const sequelize = require('../config/database');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Material = require('./Material');

// Define Relationships
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

// Function to sync database
const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('📦 Database connection establishment... OK');

        // Sync models (alter: true updates schema without dropping data if possible)
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
};

module.exports = {
    sequelize,
    initDB,
    Order,
    OrderItem,
    Material
};
