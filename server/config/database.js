const { Sequelize } = require('sequelize');
const path = require('path');

const storagePath = process.env.DB_STORAGE
    ? path.resolve(process.env.DB_STORAGE)
    : path.join(__dirname, '../../database.sqlite');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false, // Set to console.log to see SQL queries
});

module.exports = sequelize;
