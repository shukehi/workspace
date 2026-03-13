const { API_ERROR_CODES } = require('../../shared/contracts/api');

module.exports = {
    ...API_ERROR_CODES,
    VALIDATION_ERROR: 'VALIDATION_ERROR',
};
