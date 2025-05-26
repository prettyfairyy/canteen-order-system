const sql = require('mssql');

const config = {
  server: '127.0.0.1', // hoặc 'localhost'
  user: 'sa',
  password: '123',
  database: 'DBMS',
  port: 1433, // thêm dòng này rất quan trọng!
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
  sql,
  pool,
  poolConnect
};