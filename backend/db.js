const mysql = require('mysql2/promise');

const pool = mysql.createPool({

  host: 'localhost',
  user: 'root',
  password: 'BMP@1234',
  /* database: 'stock_management',*/
  database: 'stock_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0

});

module.exports = pool;



