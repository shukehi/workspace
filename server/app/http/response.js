function sendSuccess(res, data, status = 200) {
    return res.status(status).json(data);
}

function sendCreated(res, data) {
    return sendSuccess(res, data, 201);
}

module.exports = {
    sendSuccess,
    sendCreated,
};
