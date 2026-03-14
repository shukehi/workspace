function createPaginationResponse({
    rows = [],
    total = 0,
    page = 1,
    pageSize = 20,
    summary,
    facets,
}) {
    return {
        rows,
        total,
        page,
        pageSize,
        ...(summary !== undefined ? { summary } : {}),
        ...(facets !== undefined ? { facets } : {}),
    };
}

module.exports = {
    createPaginationResponse,
};
