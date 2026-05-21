// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({

//   host: 'localhost',
//   user: 'root',
//   password: 'BMP@1234',
//   /* database: 'stock_management',*/
//   database: 'stock_management',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0

// });

// module.exports = pool;



const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;