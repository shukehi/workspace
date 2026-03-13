const { createApiErrorResponse } = require('../../shared/contracts/api');
const ERROR_CODES = require('../errors/errorCodes');

function notFound(req, res, next) {
    res.status(404).json(createApiErrorResponse(ERROR_CODES.NOT_FOUND, {
        message: 'Not found',
        path: req.originalUrl || req.url,
    }));
}

module.exports = notFound;
