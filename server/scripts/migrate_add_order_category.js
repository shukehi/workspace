const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function migrateAddOrderCategory() {
    try {
        await sequelize.authenticate();

        const queryInterface = sequelize.getQueryInterface();
        const table = await queryInterface.describeTable('orders');

        if (table.category) {
            console.log('✅ orders.category already exists, skip migration');
            return;
        }

        await queryInterface.addColumn('orders', 'category', {
            type: DataTypes.STRING,
            allowNull: true
        });

        console.log('✅ Migration completed: added orders.category');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

migrateAddOrderCategory();
