// Script: run with tsx
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

async function migrateAddOrderCategory(): Promise<void> {
    try {
        await sequelize.authenticate();

        const queryInterface = sequelize.getQueryInterface();
        const table = await queryInterface.describeTable('orders');

        if ((table as Record<string, unknown>)['category']) {
            console.log('orders.category already exists, skip migration');
            return;
        }

        await queryInterface.addColumn('orders', 'category', {
            type: DataTypes.STRING,
            allowNull: true
        });

        console.log('Migration completed: added orders.category');
    } catch (error: any) {
        console.error('Migration failed:', error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

migrateAddOrderCategory();
