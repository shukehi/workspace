const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

// Host static files from current directory
app.use(express.static(__dirname));

// Proxy API requests
app.use('/api', createProxyMiddleware({
    target: 'http://47.98.198.45:8802',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // remove /api prefix
    },
}));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
