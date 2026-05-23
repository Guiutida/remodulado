const mysql = require("mysql2/promise");

const banco = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "duopratic",
    port: Number(process.env.DB_PORT || 3307),
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = banco;
