export {};

function sendSuccess(res: any, data: unknown, status = 200) {
    return res.status(status).json(data);
}

function sendCreated(res: any, data: unknown) {
    return sendSuccess(res, data, 201);
}

module.exports = {
    sendSuccess,
    sendCreated,
};
