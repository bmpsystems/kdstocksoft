const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // Updated: uses mysql2
const app = express();
app.use(express.json());
const PORT = 5000;
app.use(cors());
app.use(bodyParser.json());
const nodemailer = require('nodemailer');
require('dotenv').config();


const JWT_SECRET = "xJ9gMnw49nF7gWr82MZ13Cb1LpX7zV6p7Kd93TvsZzmw8fPxy2eUhv91PgXZJH5o";

// Get Menu from Database

app.get('/menu-items', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM menu_items');
    res.json(results);
  } catch (err) {
    console.error('Menu fetch error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// SIGN UP API

app.post('/newuser', async (req, res) => {
  const { username, tempPassword, department } = req.body;

  // Validate input
  if (!username || !tempPassword) {
    return res.status(400).json({ message: 'Username and temporary password are required' });
  }

  try {
    // Check if username already exists
    const [existing] = await pool.execute(
      'SELECT * FROM users WHERE username = ? and active = 1',
      [username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Insert username and plain-text temp password into the 'users' table
    await pool.execute(
      'INSERT INTO users (username, password, Dept_Id, Active) VALUES (?, ?, ?, ?)',
      [username, tempPassword, null, 1]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    const mailOptions = {
      from: '"BMP Systems" <sohinibera.bmpsystems@gmail.com>',
      to: username, // assuming username is the user's email address
      subject: 'Your BMP Systems Account Has Been Created',
      html: `
        <h3>Welcome to BMP Systems!</h3>
        <p>Your account has been created. Please use the following temporary password to log in:</p>
        <p><b>Username:</b> ${username}</p>
        <p><b>Temporary Password:</b> <span style="color:#00d6ab">${tempPassword}</span></p>
        <p><i>Please change your password after your first login. Your account will be activated after admin approval.</i></p>
        <br>
        <p>Thank you,<br/>BMP Systems Team</p>
      `
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
        // Still return success for user creation, but notify about email failure
        return res.status(201).json({
          message: 'User created successfully, but failed to send email.',
          username,
          emailError: error.message
        });
      } else {
        return res.status(201).json({
          message: 'User created successfully. Email sent.',
          username
        });
      }
    });

  } catch (err) {
    console.error('Sign Up Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

///////////////////////////

app.post('/check-user-exists', async (req, res) => {
  const { username } = req.body;
  const [users] = await pool.execute('SELECT dept_Id FROM users WHERE username = ?', [username]);
  if (users.length === 0) return res.json({ exists: false });

  const dept_Id = users[0].dept_Id;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await pool.execute(`
    INSERT INTO password_otps (username, otp, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)
  `, [username, otp]);

  const mailOptions = {
    from: '"BMP Systems" <sohinibera.bmpsystems@gmail.com>',
    to: username, // assuming username is the user's email address
    subject: 'Please verify your username Email Address',
    html: `
      <h3>Welcome to BMP Systems!</h3>
      <p><b>Your OTP is:</b> ${otp}</p>
      <p>OTP is valid for only 10 minutes</b>
    `
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email send error:', error);
      // Still return success for user creation, but notify about email failure
      return res.status(201).json({
        message: 'Email Verified Successfully',
        username,
        emailError: error.message
      });
    } else {
      return res.status(201).json({
        message: 'Email Verified Successfully',
        username
      });
    }
  });

  res.json({ exists: true, dept_Id });
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;
  const [rows] = await pool.execute(`
    SELECT * FROM password_otps
    WHERE username = ? AND otp = ? AND expires_at > NOW()
  `, [username, otp]);

  rows.length > 0
    ? res.json({ verified: true })
    : res.json({ verified: false });
});

// Reset password after OTP success
app.post('/reset-password', async (req, res) => {
  const { Username, NewPassword, Department } = req.body;

  await pool.execute(`
    UPDATE users SET password = ? WHERE username = ? AND dept_Id = ?
  `, [NewPassword, Username, Department]);

  await pool.execute('DELETE FROM password_otps WHERE username = ?', [Username]);
  res.json({ success: true });
});

/////////////////////////////

// LOGIN API

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.execute(
      `
SELECT 
  usm.id, 
  usm.username, 
  usm.name, 
  usm.password, 
  dept.department AS department,
  usm.Dept_Id
FROM users AS usm
LEFT JOIN department_master AS dept
  ON usm.dept_Id = dept.id
WHERE 
  usm.username = ? 
  AND usm.password = ? 
  AND usm.Active = 1

      `,
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];

    // Check if department is null (approval not granted yet)

    if (!user.department) {
      return res.status(403).json({
        message: 'Registration approval under process'
      });
    }


    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with success
    res.json({
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        department: user.department,
        dept_Id: user.Dept_Id,
        name: user.name
      }
    });

  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

//Change Password for Logged In Users

app.post('/update-password', async (req, res) => {
  const { Username, OldPassword, NewPassword, Department } = req.body;

  if (!Username || !NewPassword || !Department) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Fetch user by Username and Department
    const [rows] = await pool.execute(
      'SELECT Password FROM Users WHERE Username = ? AND Dept_Id = ? and Active = 1',
      [Username, Department]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found or department mismatch.' });
    }

    const dbPassword = rows[0].Password;

    // Compare old password (or use bcrypt.compare if hashed)
    if (dbPassword !== OldPassword) {
      return res.status(401).json({ error: 'Old password does not match.' });
    }

    // Update password using Username and Department as filters
    const [result] = await pool.execute(
      'UPDATE Users SET Password = ? WHERE Username = ? AND Dept_Id = ? and Active = 1',
      [NewPassword, Username, Department]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Password not updated.' });
    }

    res.status(200).json({
      Message: 'Password updated successfully.',
      Username,
      Department
    });

  } catch (err) {
    res.status(500).json({
      error: 'Internal server error.',
      details: err.message,
    });
  }
});

//Department wise Menu

app.get('/menu-items/:department', async (req, res) => {
  const department = req.params.department;

  const query = `
    SELECT m.*
    FROM menu_items m
    JOIN department_menu_access d ON m.id = d.menu_item_id
    WHERE d.department = ? AND m.active = 1
  `;

  try {
    const [rows] = await pool.execute(query, [department]);
    res.json(rows);
  } catch (err) {
    console.error('Menu Fetch Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// LIST Products

app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(`

     select pm.Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, pm.PCat_Id, pcm.Category, pm.Cost_price, pm.List_price, 
     pm.Whouse_Id, w.name, pm.Unit_Id, um.Unit, pm.HSNCode, pm.Active 
      from product_master as pm 
      join make_master as mm on pm.make_Id = mm.id
     LEFT JOIN product_category_master AS pcm 
  ON pm.PCat_Id = pcm.Id AND pm.PCat_Id != 0
  join warehouse as w
  on pm.Whouse_Id = w.id
  join unit_master as um
  on pm.Unit_Id = um.Id
      
      `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching products', details: err.message });
  }
});

app.post('/products/create', async (req, res) => {
  const { Product_name, Model_no, Make_Id, Cost_price, List_price, Whouse_Id, Unit_Id, PCat_Id, HSNCode, Created_By, Active, } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Product_master (Product_name, Model_no, Make_Id, Cost_price, List_price, Whouse_Id, Unit_Id, PCat_Id, HSNCode,
      Created_By, Active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [Product_name, Model_no, Make_Id, Cost_price, List_price, Whouse_Id, Unit_Id, PCat_Id, HSNCode, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Product_name,
      Model_no,
      Make_Id,
      Cost_price,
      List_price,
      Whouse_Id,
      Unit_Id,
      PCat_Id,
      HSNCode,
      Created_By,
      Active,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating product', details: err.message });
  }
});

// Update Products
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const {
    Product_name,
    Model_no,
    Make_Id,
    Cost_price,
    List_price,
    Whouse_Id,
    Unit_Id,
    PCat_Id,
    HSNCode,
    Modified_By
  } = req.body;

  try {
    await pool.execute(
      `UPDATE Product_master SET Product_name = ?, Model_no = ?, Make_Id = ?, Cost_price = ?, List_price = ?, Whouse_Id = ?, Unit_Id = ?, PCat_Id = ?, HSNCode = ?, Modified_By = ? WHERE Id = ?`,
      [Product_name,
        Model_no,
        Make_Id,
        Cost_price,
        List_price,
        Whouse_Id,
        Unit_Id,
        PCat_Id,
        HSNCode,
        Modified_By, id]
    );

    const [rows] = await pool.execute(` select pm.Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, pm.PCat_Id, pcm.Category, pm.Cost_price, pm.List_price, 
     pm.Whouse_Id, w.name, pm.Unit_Id, um.Unit, pm.HSNCode, pm.Active 
      from product_master as pm 
      join make_master as mm on pm.make_Id = mm.id
     LEFT JOIN product_category_master AS pcm 
  ON pm.PCat_Id = pcm.Id AND pm.PCat_Id != 0
  join warehouse as w
  on pm.Whouse_Id = w.id
  join unit_master as um
  on pm.Unit_Id = um.Id WHERE pm.Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating product', details: err.message });
  }
});

// TOGGLE Active State for Products
app.post('/products/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Product_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(` select pm.Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, pm.PCat_Id, pcm.Category, pm.Cost_price, pm.List_price, 
     pm.Whouse_Id, w.name, pm.Unit_Id, um.Unit, pm.Active 
      from product_master as pm 
      join make_master as mm on pm.make_Id = mm.id
     LEFT JOIN product_category_master AS pcm 
  ON pm.PCat_Id = pcm.Id AND pm.PCat_Id != 0
  join warehouse as w
  on pm.Whouse_Id = w.id
  join unit_master as um
  on pm.Unit_Id = um.Id WHERE pm.Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});



////////////V V IMPORTANT V V/////////////

// Product Search Helper with Model No for autocomplete
app.get('/product-search', async (req, res) => {
  const { query } = req.query;

  // Only search if at least 3 characters are entered
  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Please enter at least 3 characters.' });
  }

  // Remove the semicolon before LIMIT to fix SQL syntax error
  const sql = `
    SELECT 
      a.Id, 
      a.Product_name, 
      a.Make_Id, 
      b.Make, 
      a.Model_no, 
      a.Cost_price,
      a.Unit_Id,
      c.Unit,
      d.Name
    FROM Product_master AS a
    LEFT JOIN make_master AS b ON a.Make_Id = b.Id
    LEFT JOIN unit_master AS c ON a.Unit_Id = c.Id
    LEFT JOIN warehouse AS d ON d.Id = a.Whouse_Id
    WHERE (a.Product_name LIKE ? OR a.Model_no LIKE ?)
      AND a.Active = 1
    LIMIT 20
  `;

  try {
    const [rows] = await pool.execute(sql, [`%${query}%`, `%${query}%`]);
    res.json(rows);
  } catch (err) {
    console.error('Autocomplete Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Stock Search Helper with Model No for autocomplete
app.get('/stock-search', async (req, res) => {
  const { query } = req.query;

  // Only search if at least 3 characters are entered
  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Please enter at least 3 characters.' });
  }

  const sql = `
SELECT 
  st.Id, 
  pm.Product_name, 
  pm.Model_no, 
  pm.Cost_price, 
  pm.Make_Id, 
  mm.Make, 
  st.Quantity, 
  pm.Unit_Id, 
  um.Unit,
  pm.Whouse_Id,
  wm.Name
FROM stock st 
JOIN product_master pm ON pm.Id = st.Prod_Id
JOIN make_master mm ON mm.Id = pm.Make_Id
JOIN unit_master um ON um.Id = pm.Unit_Id
JOIN warehouse wm ON wm.Id = pm.Whouse_Id
WHERE (pm.Product_name LIKE ? OR pm.Model_no LIKE ?)
ORDER BY st.Id DESC
LIMIT 20;`;

  try {
    const [rows] = await pool.execute(sql, [`%${query}%`, `%${query}%`]);
    res.json(rows);
  } catch (err) {
    console.error('Autocomplete Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Company Search Helper for autocomplete
app.get('/company-search', async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Please enter at least 3 characters.' });
  }

  const sql = `
SELECT 
  cm.Id, 
  cm.Company, 
  cm.Address, 
  cm.Cat_Id, 
  catm.Category, 
  cm.Region_Id, 
  regm.Region, 
  cm.Type_Id, 
  typm.Type, 
  cm.Gstin, 
  cm.Pan, 
  cm.Website, 
  cm.Internal_Note, 
  cm.Active
FROM stock_management.company_master AS cm
INNER JOIN stock_management.category_master AS catm ON cm.Cat_Id = catm.Id
INNER JOIN stock_management.region_master AS regm ON cm.Region_Id = regm.Id
INNER JOIN stock_management.type_master AS typm ON cm.Type_Id = typm.Id
WHERE (cm.Company LIKE ? OR cm.Gstin LIKE ? OR cm.Pan LIKE ?)
  AND cm.Active = 1
ORDER BY cm.Company ASC
LIMIT 20
`;

  try {
    // Provide a parameter for each placeholder in the WHERE clause
    const params = [`%${query}%`, `%${query}%`, `%${query}%`];
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Autocomplete Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

//Stock Summary Get all Api with Date change
app.get('/stock-summary', async (req, res) => {

  try {
    const [rows] = await pool.execute(
      `
SELECT 
  pm.Make_Id,
  mm.Make,
  SUM(pm.Cost_Price * ms.Quantity) AS Amount,
  SUM(ms.Quantity) AS total_qty,
  pm.Unit_Id,
  um.Unit
FROM stock AS ms
JOIN product_master AS pm ON ms.Prod_Id = pm.Id
JOIN make_master AS mm ON pm.Make_Id = mm.Id
JOIN unit_master AS um ON pm.Unit_Id = um.Id
GROUP BY pm.Make_Id, mm.Make, pm.Unit_Id, um.Unit
ORDER BY total_qty DESC;
`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: 'Error fetching filtered stock summary',
      details: err.message,
    });
  }
});

// LIST Minimum Stock List
app.get('/minimum-stock', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
SELECT 
  st.Id,
  st.Prod_Id,
  pm.Product_name,
  pm.Model_no,
  pm.Make_Id,
  mm.Make,
  st.Quantity,
    pm.Cost_price,
  pm.Unit_Id,
  um.Unit
FROM stock AS st
JOIN product_master AS pm ON st.Prod_Id = pm.Id
LEFT JOIN make_master AS mm ON pm.Make_Id = mm.Id
LEFT JOIN minimum_stock AS ms ON ms.Prod_Id = st.Prod_Id
LEFT JOIN unit_master AS um ON pm.Unit_Id = um.Id
WHERE st.Quantity < 50;  
      `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching products', details: err.message });
  }
});

app.get('/stock-list', async (req, res) => {
  const makeId = req.query.makeId;
  const pCat_Id = req.query.pCat_Id;
  const Whouse_Id = req.query.Whouse_Id;

  let whereClauses = [];
  let params = [];

  if (makeId) {
    whereClauses.push('pm.Make_Id = ?');
    params.push(makeId);
  }

  if (pCat_Id) {
    whereClauses.push('pm.PCat_Id = ?');
    params.push(pCat_Id);
  }

  if (Whouse_Id) {
    whereClauses.push('pm.Whouse_Id = ?');
    params.push(Whouse_Id);
  }

  whereClauses.push('pm.Active = 1');
  const whereClauseString = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const query = `
  
SELECT 
    ms.Id,
    ms.Prod_Id,
    pm.Product_name,
    pm.Model_no,
    pm.Make_Id,
    mm.Make,
    ms.Quantity AS stock_qty,
    COALESCE(di.defective_qty, 0) AS defective_qty,
    pm.Unit_Id,
    um.Unit,
    pm.Cost_Price,
    pm.Whouse_Id,
    wm.Name,
    pm.PCat_Id,
    pcm.Category,
    pm.HSNCode
FROM stock_management.stock AS ms
LEFT JOIN (
    SELECT Prod_Id, SUM(Quantity) AS defective_qty
    FROM defective_items
    GROUP BY Prod_Id
) AS di ON ms.Prod_Id = di.Prod_Id
LEFT JOIN product_master AS pm ON ms.Prod_Id = pm.Id
LEFT JOIN make_master AS mm ON pm.Make_Id = mm.Id
LEFT JOIN unit_master AS um ON pm.Unit_Id = um.Id
LEFT JOIN warehouse AS wm ON pm.Whouse_Id = wm.Id
LEFT JOIN product_category_master AS pcm ON pm.PCat_Id = pcm.Id

    ${whereClauseString}
  `;

  try {
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

//Stock In Make wise
app.post('/daily-stock-in', async (req, res) => {
  try {
    const { make_Id, pCat_Id, inv_date, credit_date } = req.body;

    // Build WHERE clause dynamically
    let whereClauses = [];
    let params = [];

    if (make_Id) {
      whereClauses.push('pm.Make_Id = ?');
      params.push(make_Id);
    }
    if (pCat_Id) {
      whereClauses.push('pm.PCat_Id = ?');
      params.push(pCat_Id);
    }
    if (inv_date) {
      whereClauses.push('si.Invoice_Date = ?');
      params.push(inv_date);
    }
    if (credit_date) {
      whereClauses.push('si.Credit_Date = ?');
      params.push(credit_date);
    }

    whereClauses.push('pm.Active = 1');
    const whereClauseString = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const query = `
      SELECT 
        si.Id AS stock_id,
        ppd.Purchase_Order,
        ppd.Invoice_No,
        si.Purchase_Date,
        si.Invoice_Date,
        si.Comp_Id,
         cm.Company,
        cm.Address,
        si.From_Address,
        si.Is_Return,
        si.Credit_No, 
        si.Credit_Date, 
        si.Org_InvNo, 
        si.Org_Invdt,
        si.Created_By,
        si.Active,

        ppd.Id AS details_id,
        ppd.Prod_Id,
        ppd.Remarks,
        pm.Product_name,
        pm.Model_no,
        pm.Cost_price,
        pm.Make_Id,
        mm.Make,
        ppd.Quantity,
        pm.Unit_Id,
        um.Unit,
        pm.Whouse_Id,
        wm.Name

      FROM stock_in si
   JOIN product_purchase_details ppd 
        ON ppd.Purchase_Order = si.Purchase_Order 
        OR (ppd.Credit_No IS NOT NULL AND ppd.Credit_No = si.Org_InvNo)
      JOIN company_master cm ON cm.Id = si.Comp_Id
      JOIN product_master pm ON pm.Id = ppd.Prod_Id
      JOIN make_master mm ON mm.Id = pm.Make_Id
      JOIN unit_master um ON um.Id = pm.Unit_Id
      JOIN warehouse wm ON wm.Id = pm.Whouse_Id
      ${whereClauseString}
  ORDER BY si.Purchase_Date DESC, ppd.Purchase_Order DESC, ppd.Credit_No
    `;

    const [rows] = await pool.execute(query, params);

    const grouped = {};

    for (const row of rows) {
      const groupKey = `${row.stock_id}_${row.Purchase_Order}_${row.Invoice_No}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          Id: row.stock_id,
          Purchase_Order: row.Purchase_Order,
          Invoice_No: row.Invoice_No,
          Purchase_Date: row.Purchase_Date,
          Invoice_Date: row.Invoice_Date,
          Comp_Id: row.Comp_Id,
          Company: row.Company,
          Address: row.Address,
          From_Address: row.From_Address,
          Is_Return: row.Is_Return,
          Credit_No: row.Credit_No,
          Credit_Date: row.Credit_Date,
          Org_InvNo: row.Org_InvNo,
          Org_Invdt: row.Org_Invdt,
          Created_By: row.Created_By,
          Active: row.Active,
          Total_Quantity: 0,
          Total_Price: 0,
          prod_details: [],
          Make: ''
        };
      }

      const linePrice = row.Cost_price * row.Quantity;

      grouped[groupKey].prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Remarks: row.Remarks,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
      });

      grouped[groupKey].Total_Quantity += row.Quantity;
      grouped[groupKey].Total_Price += linePrice;
    }

    // Populate Make list
    for (const groupKey in grouped) {
      const makes = grouped[groupKey].prod_details
        .map(p => p.Make)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      grouped[groupKey].Make = makes.join(', ');
      grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);
    }

    const formatted = Object.values(grouped);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching stock-in records', details: err.message });
  }
});

//Stock In List
app.get('/stock-in', async (req, res) => {
  try {
    const [rows] = await pool.execute(`

      SELECT 
      si.Id AS stock_id,
      ppd.Purchase_Order,
      ppd.Invoice_No,
      si.Purchase_Date,
      si.Invoice_Date,
      si.Comp_Id,
      cm.Company,
      cm.Address,
      si.From_Address,
      si.Is_Return,
      si.Return_Purpose,
      si.Return_Date,
      si.Challan,
      si.Credit_No, 
      si.Credit_Date, 
      si.Org_InvNo, 
      si.Org_Invdt,
      si.Created_By,
      si.Active,

      ppd.Id AS details_id,
      ppd.Prod_Id,
      ppd.Remarks,
      pm.Product_name,
      pm.Model_no,
      pm.Cost_price,
      pm.Make_Id,
      mm.Make,
      ppd.Quantity,
      pm.Unit_Id,
      um.Unit,
      pm.Whouse_Id,
      wm.Name,
      ppd.Challan AS ppd_Challan

    FROM stock_in si
    JOIN product_purchase_details ppd 
ON (
  (ppd.Purchase_Order = si.Purchase_Order AND ppd.Challan = si.Challan)
  OR ((ppd.Credit_No IS NOT NULL AND ppd.Credit_No = si.Credit_No) or
  (ppd.Purchase_Order IS NOT NULL AND ppd.Purchase_Order = si.Purchase_Order) or
  (ppd.Challan IS NOT NULL AND ppd.Challan = si.Challan))
)
    JOIN company_master cm ON cm.Id = si.Comp_Id
    JOIN product_master pm ON pm.Id = ppd.Prod_Id
    JOIN make_master mm ON mm.Id = pm.Make_Id
    JOIN unit_master um ON um.Id = pm.Unit_Id
    JOIN warehouse wm ON wm.Id = pm.Whouse_Id
      ORDER BY si.Purchase_Date DESC, ppd.Purchase_Order DESC, ppd.Credit_No
    `);

    // Helper to format date as 'YYYY-MM-DD'
    function formatDateToYMD(date) {
      if (!date) return null;
      // Accepts both Date and string
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const grouped = {};

    for (const row of rows) {
      const groupKey = `${row.stock_id}_${row.Purchase_Order}_${row.Invoice_No}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          Id: row.stock_id,
          Purchase_Order: row.Purchase_Order,
          Invoice_No: row.Invoice_No,
          Purchase_Date: formatDateToYMD(row.Purchase_Date),
          Invoice_Date: formatDateToYMD(row.Invoice_Date),
          Comp_Id: row.Comp_Id,
          Company: row.Company,
          Address: row.Address,
          From_Address: row.From_Address,
          Is_Return: row.Is_Return,
          Return_Purpose: row.Return_Purpose,
          Return_Date: formatDateToYMD(row.Return_Date),
          Challan: row.Challan,
          Credit_No: row.Credit_No,
          Credit_Date: formatDateToYMD(row.Credit_Date),
          Org_InvNo: row.Org_InvNo,
          Org_Invdt: formatDateToYMD(row.Org_Invdt),
          Created_By: row.Created_By,
          Active: row.Active,
          Total_Quantity: 0,
          Total_Price: 0,
          prod_details: [],
          Make: ''
        };
      }

      const linePrice = row.Cost_price * row.Quantity;

      grouped[groupKey].prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
        Challan: row.ppd_Challan, // include Challan from product_purchase_details
        Remarks: row.Remarks,
      });

      grouped[groupKey].Total_Quantity += row.Quantity;
      grouped[groupKey].Total_Price += linePrice;
    }

    // Populate Make list
    for (const groupKey in grouped) {
      const makes = grouped[groupKey].prod_details
        .map(p => p.Make)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      grouped[groupKey].Make = makes.join(', ');
      grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);
    }

    const formatted = Object.values(grouped);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching stock-in records', details: err.message });
  }
});

//Create Stock In
app.post('/stock-in/create', async (req, res) => {
  const {
    Purchase_Order,
    Purchase_Date,
    Invoice_No,
    Invoice_Date,
    Comp_Id,
    From_Address,
    Is_Return,
    Return_Purpose,
    Return_Date,
    Challan,
    Credit_No,
    Credit_Date,
    Org_InvNo,
    Org_Invdt,
    Created_By,
    Created_On,
    Active,
    prod_details
  } = req.body;

  let conn;
  try {
    // Basic validation
    if (!Comp_Id || !From_Address || !Array.isArray(prod_details) || prod_details.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Comp_Id, From_Address, and at least one product detail are required.'
      });
    }

    // Normalize empty strings to null
    const purchaseOrder = Purchase_Order?.trim() || null;
    const invoiceNo = Invoice_No?.trim() || null;
    const creditNo = Credit_No?.trim() || null;
    const orgInvNo = Org_InvNo?.trim() || null;
    const challan = Challan?.trim() || null;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Check for duplicate Credit Note Number if provided
    if (creditNo) {
      const [creditDup] = await conn.execute(
        `SELECT 1 FROM stock_in WHERE Credit_No = ? LIMIT 1`,
        [creditNo]
      );
      if (creditDup.length > 0) {
        throw new Error('A stock-in entry with this Credit Note Number already exists.');
      }
    }

    // Check for duplicate Challan No if provided
    if (challan) {
      const [challanDup] = await conn.execute(
        `SELECT 1 FROM stock_in WHERE Challan = ? LIMIT 1`,
        [challan]
      );
      if (challanDup.length > 0) {
        throw new Error('A stock-in entry with this Challan Number already exists.');
      }
    }

    // Check for duplicate Original Invoice Number if provided
    if (orgInvNo) {
      const [orgInvDup] = await conn.execute(
        `SELECT 1 FROM stock_in WHERE Org_InvNo = ? LIMIT 1`,
        [orgInvNo]
      );
      if (orgInvDup.length > 0) {
        throw new Error('A stock-in entry with this Original Invoice Number already exists.');
      }
    }

    // Check for duplicate Purchase Order and Invoice No combination
    if (purchaseOrder && invoiceNo) {
      const [dup] = await conn.execute(
        `SELECT 1 FROM stock_in WHERE Purchase_Order = ? AND Invoice_No = ? LIMIT 1`,
        [purchaseOrder, invoiceNo]
      );
      if (dup.length > 0) {
        throw new Error('A similar stock-in entry already exists for the given identifiers.');
      }
    }

    // Insert stock_in (Whouse_Id is NOT saved in stock_in table)
    const [stockInResult] = await conn.execute(
      `INSERT INTO stock_in 
        (Purchase_Order, Purchase_Date, Invoice_No, Invoice_Date, Comp_Id, From_Address, 
         Is_Return, Return_Purpose, Return_Date, Challan, Credit_No, Credit_Date, Org_InvNo, Org_Invdt,
         Created_By, Created_On, Active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseOrder,
        Purchase_Date || null,
        invoiceNo,
        Invoice_Date || null,
        Comp_Id,
        From_Address,
        Is_Return ? 1 : 0,
        Return_Purpose,
        Return_Date || null,
        challan,
        creditNo,
        Credit_Date || null,
        orgInvNo,
        Org_Invdt || null,
        Created_By,
        Created_On,
        Active ? 1 : 0
      ]
    );

    const stockInId = stockInResult.insertId;

    // Insert product_purchase_details & update stock
    for (const detail of prod_details) {
      // Validate required product fields
      if (
        !detail.Prod_Id ||
        typeof detail.Quantity !== 'number' ||
        isNaN(detail.Quantity) ||
        detail.Quantity < 0
      ) {
        throw new Error('Each product must have a valid Prod_Id and non-negative Quantity.');
      }

      // Insert into product_purchase_details
      await conn.execute(
        `INSERT INTO product_purchase_details 
          (Purchase_Order, Invoice_No, Credit_No, Challan, Prod_Id, Quantity, Remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseOrder,
          invoiceNo,
          creditNo,
          challan,
          detail.Prod_Id,
          detail.Quantity,
          detail.Remarks,
        ]
      );

      // Update product_master Whouse_Id for this product if Whouse_Id is provided
      if (detail.Whouse_Id) {
        await conn.execute(
          `UPDATE product_master SET Whouse_Id = ? WHERE Id = ?`,
          [detail.Whouse_Id, detail.Prod_Id]
        );
      }

      // Update stock table
      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ?`,
        [detail.Prod_Id]
      );

      if (stockRows.length > 0) {
        const updatedQty = Number(stockRows[0].Quantity) + Number(detail.Quantity);
        await conn.execute(
          `UPDATE stock SET Quantity = ? WHERE Id = ?`,
          [updatedQty, stockRows[0].Id]
        );
      } else {
        await conn.execute(
          `INSERT INTO stock (Prod_Id, Quantity) VALUES (?, ?)`,
          [detail.Prod_Id, detail.Quantity]
        );
      }
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      message: 'Stock-in created successfully',
      stock_in_id: stockInId,
      data: {
        Purchase_Order: purchaseOrder,
        Purchase_Date,
        Invoice_No: invoiceNo,
        Invoice_Date,
        Comp_Id,
        From_Address,
        Is_Return: Is_Return ? 1 : 0,
        Return_Purpose,
        Return_Date,
        Challan: challan,
        Credit_No: creditNo,
        Credit_Date,
        Org_InvNo: orgInvNo,
        Org_Invdt,
        Created_By,
        Created_On,
        Active: Active ? 1 : 0,
        prod_details
      }
    });

  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { }
      conn.release();
    }
    res.status(400).json({
      error: 'Error creating stock-in record',
      details: err.message
    });
  }
});

//Update Stock In
app.put('/stock-in/:id', async (req, res) => {
  const { id } = req.params;
  const {
    Comp_Id,
    From_Address,
    Active,
    Modified_By,
    Modified_On,
    prod_details = [],
    Is_Return,
    Return_Purpose,
    Return_Date,
    Challan,
    Credit_No,
    Credit_Date,
    Org_InvNo,
    Org_Invdt,
    Purchase_Order,
    Purchase_Date,
    Invoice_No,
    Invoice_Date,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Step 1: Get existing stock_in record
    const [existing] = await conn.execute(
      `SELECT Purchase_Order, Invoice_No, Credit_No, Challan FROM stock_in WHERE Id = ?`,
      [id]
    );

    if (existing.length === 0) {
      throw new Error("Stock-in record not found.");
    }

    // Use new values if provided, else fallback to existing
    const oldPurchaseOrder = existing[0].Purchase_Order;
    const oldInvoiceNo = existing[0].Invoice_No;
    const oldCreditNo = existing[0].Credit_No;
    const oldChallan = existing[0].Challan;

    // Step 2: Get existing product_purchase_details to revert stock
    const [oldDetails] = await conn.execute(
      `SELECT Prod_Id, Quantity FROM product_purchase_details 
       WHERE (Purchase_Order = ? AND Invoice_No = ?) OR Credit_No = ? OR Challan = ?`,
      [oldPurchaseOrder, oldInvoiceNo, oldCreditNo, oldChallan]
    );

    for (const detail of oldDetails) {
      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ?`,
        [detail.Prod_Id]
      );

      if (stockRows.length > 0) {
        const updatedQty = stockRows[0].Quantity - detail.Quantity;
        await conn.execute(
          `UPDATE stock SET Quantity = ? WHERE Id = ?`,
          [updatedQty, stockRows[0].Id]
        );
      }
    }

    // Step 3: Delete old product_purchase_details
    await conn.execute(
      `DELETE FROM product_purchase_details 
       WHERE (Purchase_Order = ? AND Invoice_No = ?) OR Credit_No = ? OR Challan = ?`,
      [oldPurchaseOrder, oldInvoiceNo, oldCreditNo, oldChallan]
    );

    // Step 4: Update stock_in record with all fields
    await conn.execute(
      `UPDATE stock_in 
       SET 
         Comp_Id = ?, 
         From_Address = ?, 
         Active = ?, 
         Modified_By = ?, 
         Modified_On = ?,
         Is_Return = ?,
         Return_Purpose = ?,
         Return_Date = ?,
         Challan = ?,
         Credit_No = ?,
         Credit_Date = ?,
         Org_InvNo = ?,
         Org_Invdt = ?,
         Purchase_Order = ?,
         Purchase_Date = ?,
         Invoice_No = ?,
         Invoice_Date = ?
       WHERE Id = ?`,
      [
        Comp_Id,
        From_Address,
        Active ? 1 : 0,
        Modified_By,
        Modified_On,
        Is_Return ? 1 : 0,
        Return_Purpose || null,
        Return_Date || null,
        Challan || null,
        Credit_No || null,
        Credit_Date || null,
        Org_InvNo || null,
        Org_Invdt || null,
        Purchase_Order || null,
        Purchase_Date || null,
        Invoice_No || null,
        Invoice_Date || null,
        id
      ]
    );

    // Step 5: Insert updated product_purchase_details and update stock
    if (Array.isArray(prod_details) && prod_details.length > 0) {
      for (const detail of prod_details) {
        if (
          detail &&
          typeof detail.Prod_Id !== 'undefined' &&
          typeof detail.Quantity !== 'undefined' &&
          detail.Prod_Id !== null &&
          detail.Quantity !== null &&
          !isNaN(Number(detail.Prod_Id)) &&
          !isNaN(Number(detail.Quantity))
        ) {
          // Only insert fields that exist in product_purchase_details table
          // Remove Whouse_Id from insert, as it does not exist in the table
          await conn.execute(
            `INSERT INTO product_purchase_details 
              (Purchase_Order, Invoice_No, Credit_No, Challan, Prod_Id, Quantity, Remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              Purchase_Order || oldPurchaseOrder,
              Invoice_No || oldInvoiceNo,
              Credit_No || oldCreditNo,
              Challan || oldChallan,
              detail.Prod_Id,
              detail.Quantity,
              detail.Remarks

            ]
          );

          // Update product_master Whouse_Id for this product if provided
          if (detail.Whouse_Id) {
            await conn.execute(
              `UPDATE product_master SET Whouse_Id = ? WHERE Id = ?`,
              [detail.Whouse_Id, detail.Prod_Id]
            );
          }

          // Update stock
          const [stockRows] = await conn.execute(
            `SELECT Id, Quantity FROM stock WHERE Prod_Id = ?`,
            [detail.Prod_Id]
          );

          if (stockRows.length > 0) {
            const updatedQty = stockRows[0].Quantity + detail.Quantity;
            await conn.execute(
              `UPDATE stock SET Quantity = ? WHERE Id = ?`,
              [updatedQty, stockRows[0].Id]
            );
          } else {
            await conn.execute(
              `INSERT INTO stock (Prod_Id, Quantity)
               VALUES (?, ?)`,
              [detail.Prod_Id, detail.Quantity]
            );
          }
        }
      }
    }

    await conn.commit();
    conn.release();

    res.status(200).json({ message: "Stock-in updated successfully." });

  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { }
      conn.release();
    }
    res.status(500).json({
      error: "Error updating stock-in record",
      details: err.message
    });
  }
});

//Toggle Stock In
app.post('/stock-in/toggle', async (req, res) => {
  const { id } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Step 1: Get current status
    const [existingRows] = await conn.execute(
      `SELECT Active, Purchase_Order, Org_InvNo, Challan FROM stock_in WHERE Id = ?`,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error('Stock-in record not found');
    }

    const currentActive = existingRows[0].Active;
    const purchaseOrder = existingRows[0].Purchase_Order;
    const OrgInvNo = existingRows[0].Org_InvNo;
    const Challan = existingRows[0].Challan;
    const newActive = currentActive ? 0 : 1;

    // Step 2: Update stock_in table
    await conn.execute(
      `UPDATE stock_in SET Active = ? WHERE Id = ?`,
      [newActive, id]
    );

    // Step 3: Adjust stock
    const [productRows] = await conn.execute(
      `SELECT Prod_Id, Quantity FROM product_purchase_details WHERE Purchase_Order = ? OR Org_InvNo = ? OR Challan = ?`,
      [purchaseOrder, OrgInvNo, Challan]
    );

    for (const product of productRows) {
      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [product.Prod_Id]
      );

      if (stockRows.length === 0) {
        throw new Error(`Product ID ${product.Prod_Id} not found in stock`);
      }

      const currentQty = stockRows[0].Quantity;
      const updatedQty = newActive
        ? currentQty + product.Quantity
        : currentQty - product.Quantity;

      if (updatedQty < 0) {
        throw new Error(`Insufficient stock while deactivating product ID ${product.Prod_Id}`);
      }

      await conn.execute(
        `UPDATE stock SET Quantity = ? WHERE Id = ?`,
        [updatedQty, stockRows[0].Id]
      );
    }

    // Step 4: Re-fetch and format updated stock-in data (only the toggled one)
    const [rows] = await conn.execute(`
       
          SELECT 
        si.Id AS stock_id,
        ppd.Purchase_Order,
        ppd.Invoice_No,
        si.Purchase_Date,
        si.Invoice_Date,
        si.Comp_Id,
        cm.Company,
        cm.Address,
        si.From_Address,
        si.Is_Return,
        si.Return_Purpose,
        si.Return_Date,
        si.Challan,
        si.Credit_No, 
        si.Credit_Date, 
        si.Org_InvNo, 
        si.Org_Invdt,
        si.Created_By,
        si.Active,

        ppd.Id AS details_id,
        ppd.Prod_Id,
        ppd.Remarks,
        pm.Product_name,
        pm.Model_no,
        pm.Cost_price,
        pm.Make_Id,
        mm.Make,
        ppd.Quantity,
        pm.Unit_Id,
        um.Unit,
        pm.Whouse_Id,
        wm.Name,
        ppd.Challan AS ppd_Challan

      FROM stock_in si
      JOIN product_purchase_details ppd 
  ON (
    (ppd.Purchase_Order = si.Purchase_Order AND ppd.Challan = si.Challan)
    OR ((ppd.Credit_No IS NOT NULL AND ppd.Credit_No = si.Credit_No) or
    (ppd.Purchase_Order IS NOT NULL AND ppd.Purchase_Order = si.Purchase_Order) or
    (ppd.Challan IS NOT NULL AND ppd.Challan = si.Challan))
  )
      JOIN company_master cm ON cm.Id = si.Comp_Id
      JOIN product_master pm ON pm.Id = ppd.Prod_Id
      JOIN make_master mm ON mm.Id = pm.Make_Id
      JOIN unit_master um ON um.Id = pm.Unit_Id
      JOIN warehouse wm ON wm.Id = pm.Whouse_Id
      WHERE si.Id = ?
    `, [id]);

    await conn.commit();
    conn.release();

    // Group result to match /stock-in GET output
    if (rows.length === 0) return res.status(404).json({ error: "Stock-in entry not found" });

    const groupKey = `${rows[0].stock_id}_${rows[0].Purchase_Order}_${rows[0].Invoice_No}`;

    function formatDateToYMD(date) {
      if (!date) return null;
      // Accepts both Date and string
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const grouped = {
      Id: rows[0].stock_id,
      Purchase_Order: rows[0].Purchase_Order,
      Invoice_No: rows[0].Invoice_No,
      Purchase_Date: formatDateToYMD(rows[0].Purchase_Date),
      Invoice_Date: formatDateToYMD(rows[0].Invoice_Date),
      Comp_Id: rows[0].Comp_Id,
      Company: rows[0].Company,
      Address: rows[0].Address,
      From_Address: rows[0].From_Address,
      Is_Return: rows[0].Is_Return,
      Return_Purpose: rows[0].Return_Purpose,
      Return_Date: formatDateToYMD(rows[0].Return_Date),
      Challan: rows[0].Challan,
      Credit_No: rows[0].Credit_No,
      Credit_Date: formatDateToYMD(rows[0].Credit_Date),
      Org_InvNo: rows[0].Org_InvNo,
      Org_Invdt: formatDateToYMD(rows[0].Org_Invdt),
      Created_By: rows[0].Created_By,
      Active: rows[0].Active,
      Total_Quantity: 0,
      Total_Price: 0,
      prod_details: [],
      Make: ''
    };

    const makeSet = new Set();

    for (const row of rows) {
      const linePrice = row.Cost_price * row.Quantity;

      grouped.prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
        Challan: row.ppd_Challan, // include Challan from product_purchase_details
        Remarks: row.Remarks,
      });

      grouped.Total_Quantity += row.Quantity;
      grouped.Total_Price += linePrice;
      makeSet.add(row.Make);
    }

    grouped.Make = [...makeSet].join(', ');
    grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);

    res.json(grouped);

  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

//Stock Out Make wise
app.post('/daily-stock-out', async (req, res) => {
  try {
    // Accept both "user" and "name" as the user filter (for compatibility with frontend)
    // Enable fromDate and toDate filtering
    const { make_Id, pCat_Id, date, fromDate, toDate, user, name } = req.body;

    // Build WHERE clause dynamically
    let whereClauses = [];
    let params = [];

    if (make_Id) {
      whereClauses.push('pm.Make_Id = ?');
      params.push(make_Id);
    }
    if (pCat_Id) {
      whereClauses.push('pm.PCat_Id = ?');
      params.push(pCat_Id);
    }
    // Date filtering: support single date, or fromDate/toDate range
    if (fromDate && toDate) {
      whereClauses.push('so.Invoice_Date BETWEEN ? AND ?');
      params.push(fromDate, toDate);
    } else if (fromDate) {
      whereClauses.push('so.Invoice_Date >= ?');
      params.push(fromDate);
    } else if (toDate) {
      whereClauses.push('so.Invoice_Date <= ?');
      params.push(toDate);
    } 
    // Accept either user or name as Created_By filter
    if (user || name) {
      whereClauses.push('so.Created_By = ?');
      params.push(user || name);
    }

    whereClauses.push('pm.Active = 1');
    const whereClauseString = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const query = `
SELECT 
    so.Id AS stock_id,
    so.Invoice_No,
    so.Invoice_Date,
    so.Delivery_Challan,
    so.Purpose,
    so.Comp_Id,
    cm.Company,
    cm.Address,
    so.To_Address,
    so.Packing_By,
    so.Checking_By,
    so.Delivery_By,
    so.Created_By,
    so.Created_On,
    so.Active,

    pod.Id AS details_id,
    pod.Prod_Id,
    pod.Remarks,
    pm.Product_name,
    pm.HSNCode,
    pm.Model_no,
    pm.Cost_price,
    pm.Whouse_Id,
    wm.Name,
    pm.Make_Id,
    mm.Make,
    pod.Quantity,
    pm.Unit_Id,
    um.Unit

FROM stock_out so
JOIN product_sold_details pod 
    ON (pod.Invoice_No = so.Invoice_No OR pod.Delivery_Challan = so.Delivery_Challan)
JOIN company_master cm 
    ON cm.Id = so.Comp_Id
JOIN product_master pm 
    ON pm.Id = pod.Prod_Id
JOIN make_master mm 
    ON mm.Id = pm.Make_Id
JOIN unit_master um 
    ON um.Id = pm.Unit_Id
JOIN warehouse wm 
    ON wm.Id = pm.Whouse_Id
${whereClauseString}
ORDER BY so.Invoice_No DESC, so.Delivery_Challan DESC;
    `;

    const [rows] = await pool.execute(query, params);

    // Group by Invoice_No (and stock_id for uniqueness)
    const grouped = {};

    for (const row of rows) {
      const groupKey = `${row.stock_id}_${row.Invoice_No}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          Id: row.stock_id,
          Invoice_No: row.Invoice_No,
          Invoice_Date: row.Invoice_Date,
          Comp_Id: row.Comp_Id,
          Delivery_Challan: row.Delivery_Challan,
          Purpose: row.Purpose,
          Company: row.Company,
          Address: row.Address,
          To_Address: row.To_Address,
          Packing_By: row.Packing_By,
          Checking_By: row.Checking_By,
          Delivery_By: row.Delivery_By,
          Created_By: row.Created_By,
          Created_On: row.Created_On,
          Active: row.Active,
          Total_Quantity: 0,
          Total_Price: 0,
          prod_details: [],
          Make: '',
        };
      }

      grouped[groupKey].prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        HSNCode: row.HSNCode,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Remarks: row.Remarks,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit
      });

      // Defensive: ensure Quantity and Cost_price are numbers
      const qty = Number(row.Quantity) || 0;
      const price = Number(row.Cost_price) || 0;
      grouped[groupKey].Total_Quantity += qty;
      grouped[groupKey].Total_Price += price * qty;
    }

    // Set Make as a comma-separated list of unique makes in prod_details
    for (const groupKey in grouped) {
      const makes = grouped[groupKey].prod_details
        .map(p => p.Make)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      grouped[groupKey].Make = makes.join(', ');
      grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);
    }

    const formatted = Object.values(grouped);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching stock-out records', details: err.message });
  }
});

//Stock Out List
app.get('/stock-out', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
SELECT 
    so.Id AS stock_id,
    so.Invoice_No,
    so.Invoice_Date,
    so.Delivery_Challan,
    so.Purpose,
    so.Comp_Id,
    cm.Company,
    cm.Address,
    so.To_Address,
    so.Packing_By,
    so.Checking_By,
    so.Delivery_By,
    so.Created_By,
    so.Active,

    pod.Id AS details_id,
    pod.Prod_Id,
    pod.Remarks,
    pm.Product_name,
    pm.Model_no,
    pm.Cost_price,
    pm.Whouse_Id,
    wm.Name,
    pm.Make_Id,
    mm.Make,
    pod.Quantity,
    pm.Unit_Id,
    um.Unit

FROM stock_out so
JOIN product_sold_details pod 
    ON pod.Invoice_No = so.Invoice_No OR pod.Delivery_Challan = so.Delivery_Challan
JOIN company_master cm 
    ON cm.Id = so.Comp_Id
JOIN product_master pm 
    ON pm.Id = pod.Prod_Id
JOIN make_master mm 
    ON mm.Id = pm.Make_Id
JOIN unit_master um 
    ON um.Id = pm.Unit_Id
JOIN warehouse wm 
    ON wm.Id = pm.Whouse_Id
ORDER BY pod.Invoice_No DESC, pod.Delivery_Challan DESC;

    `);

    function formatDateToYMD(date) {
      if (!date) return null;
      // Accepts both Date and string
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const grouped = {};

    for (const row of rows) {
      const groupKey = `${row.stock_id}_${row.Invoice_No}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          Id: row.stock_id,
          Invoice_No: row.Invoice_No,
          Invoice_Date: formatDateToYMD(row.Invoice_Date),
          Comp_Id: row.Comp_Id,
          Delivery_Challan: row.Delivery_Challan,
          Purpose: row.Purpose,
          Company: row.Company,
          Address: row.Address,
          To_Address: row.To_Address,
          Packing_By: row.Packing_By,
          Checking_By: row.Checking_By,
          Delivery_By: row.Delivery_By,
          Created_By: row.Created_By,
          Active: row.Active,
          Total_Quantity: 0,
          Total_Price: 0,
          prod_details: [],
          Make: '',
        };
      }

      grouped[groupKey].prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit,
        Remarks: row.Remarks,
      });

      grouped[groupKey].Total_Quantity += row.Quantity;
      grouped[groupKey].Total_Price += row.Cost_price * row.Quantity;
    }

    // Format Total_Price to 2 decimal places
    for (const groupKey in grouped) {
      const makes = grouped[groupKey].prod_details
        .map(p => p.Make)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      grouped[groupKey].Make = makes.join(', ');
      // Ensure Total_Price is rounded to 2 decimal places
      grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);
    }

    const formatted = Object.values(grouped);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching stock-out records', details: err.message });
  }
});

//Create stock out
app.post('/stock-out/create', async (req, res) => {
  let {
    Invoice_No,
    Invoice_Date,
    Delivery_Challan,
    Purpose,
    Comp_Id,
    To_Address,
    Packing_By,
    Checking_By,
    Delivery_By,
    Created_By,
    Created_On,
    Active,
    prod_details
  } = req.body;

  // Convert empty string to null
  if (Invoice_No === '') Invoice_No = null;
  if (Delivery_Challan === '') Delivery_Challan = null;

  const conn = await pool.getConnection();

  try {
    // 🔍 Step 1: Pre-check stock availability
    for (const detail of prod_details) {
      const [stockRows] = await conn.execute(
        `SELECT Quantity FROM stock WHERE Prod_Id = ?`,
        [detail.Prod_Id]
      );

      if (stockRows.length === 0) {
        return res.status(400).json({
          error: `Product ID ${detail.Prod_Id} not found in stock`
        });
      }

      const availableQty = stockRows[0].Quantity;
      if (availableQty < detail.Quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ID ${detail.Prod_Id}`,
          message: "Please check products quantity"
        });
      }
    }

    // 🔁 Step 2a: Check duplicate based on Invoice_No + Invoice_Date + Comp_Id
    if (Invoice_No) {
      const [duplicateInvoiceCheck] = await conn.execute(
        `SELECT Id FROM stock_out
         WHERE Invoice_No = ? AND Invoice_Date = ? AND Comp_Id = ?`,
        [Invoice_No, Invoice_Date, Comp_Id]
      );

      if (duplicateInvoiceCheck.length > 0) {
        return res.status(400).json({
          error: 'Stock-out entry already exists for this Invoice, Date and Company.'
        });
      }
    }

    // 🔁 Step 2b: Check duplicate based on Date + Challan + Purpose + Comp_Id
    if (Delivery_Challan && Purpose) {
      const [duplicateChallanCheck] = await conn.execute(
        `SELECT Id FROM stock_out
         WHERE Invoice_Date = ? AND Delivery_Challan = ? AND Purpose = ? AND Comp_Id = ?`,
        [Invoice_Date, Delivery_Challan, Purpose, Comp_Id]
      );

      if (duplicateChallanCheck.length > 0) {
        return res.status(400).json({
          error: 'Stock-out entry already exists for this Date, Challan, Purpose, and Company.'
        });
      }
    }

    // ✅ Step 3: Proceed with stock-out insert
    await conn.beginTransaction();

    const [stockOutResult] = await conn.execute(
      `INSERT INTO stock_out 
        (Invoice_No, Invoice_Date, Delivery_Challan, Purpose, Comp_Id, To_Address, Packing_By, Checking_By, Delivery_By, Created_By, Created_On, Active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Invoice_No,
        Invoice_Date,
        Delivery_Challan,
        Purpose,
        Comp_Id,
        To_Address,
        Packing_By,
        Checking_By,
        Delivery_By,
        Created_By,
        Created_On,
        Active ? 1 : 0
      ]
    );

    const stockOutId = stockOutResult.insertId;

    // 🧾 Step 4: Insert product details and update stock
    for (const detail of prod_details) {
      await conn.execute(
        `INSERT INTO product_sold_details 
          (Invoice_No, Delivery_Challan, Prod_Id, Quantity, Remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [
          Invoice_No,
          Delivery_Challan,
          detail.Prod_Id,
          detail.Quantity,
          detail.Remarks,
        ]
      );

      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [detail.Prod_Id]
      );

      const updatedQty = stockRows[0].Quantity - detail.Quantity;

      await conn.execute(
        `UPDATE stock SET Quantity = ? WHERE Id = ?`,
        [updatedQty, stockRows[0].Id]
      );
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      message: 'Stock-out created successfully and stock updated',
      stock_out_id: stockOutId,
      data: {
        Invoice_No,
        Invoice_Date,
        Delivery_Challan,
        Purpose,
        Comp_Id,
        To_Address,
        Packing_By,
        Checking_By,
        Delivery_By,
        Created_By,
        Created_On,
        Active: Active ? 1 : 0,
        prod_details
      }
    });

  } catch (err) {
    await conn.rollback();
    conn.release();

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Duplicate entry',
        details: 'Invoice number or challan might be duplicated in DB'
      });
    }

    res.status(500).json({
      error: 'Error creating stock-out record',
      details: err.message
    });
  }
});

//Update Stock Out
app.put('/stock-out/:id', async (req, res) => {
  const { id } = req.params;
  let {
    Comp_Id,
    To_Address,
    Invoice_No,
    Invoice_Date,
    Delivery_Challan,
    Purpose,
    Packing_By,
    Checking_By,
    Delivery_By,
    Active,
    Modified_By,
    Modified_On,
    prod_details
  } = req.body;

  // Helper: convert undefined to null for all fields
  function safe(val) {
    return typeof val === "undefined" ? null : val;
  }

  Comp_Id = safe(Comp_Id);
  To_Address = safe(To_Address);
  Invoice_No = safe(Invoice_No);
  Invoice_Date = safe(Invoice_Date);
  Delivery_Challan = safe(Delivery_Challan);
  Purpose = safe(Purpose);
  Packing_By = safe(Packing_By);
  Checking_By = safe(Checking_By);
  Delivery_By = safe(Delivery_By);
  Active = typeof Active === "undefined" ? null : (Active ? 1 : 0);
  Modified_By = safe(Modified_By);
  Modified_On = safe(Modified_On);
  prod_details = Array.isArray(prod_details) ? prod_details : [];

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Step 1: Get existing Invoice_No and Delivery_Challan
    const [existing] = await conn.execute(
      `SELECT Invoice_No, Delivery_Challan FROM stock_out WHERE Id = ?`,
      [id]
    );

    if (existing.length === 0) {
      throw new Error("Stock-out record not found.");
    }

    // Use both Invoice_No and Delivery_Challan for identifying product_sold_details
    const oldInvoiceNo = existing[0].Invoice_No;
    const oldDeliveryChallan = existing[0].Delivery_Challan;

    // Step 2: Restore old product quantities to stock
    // Fetch all product_sold_details for this Invoice_No or Delivery_Challan
    const [oldDetails] = await conn.execute(
      `SELECT Prod_Id, Quantity FROM product_sold_details WHERE (Invoice_No = ? OR Delivery_Challan = ?)`,
      [oldInvoiceNo, oldDeliveryChallan]
    );

    for (const old of oldDetails) {
      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [old.Prod_Id]
      );

      if (stockRows.length > 0) {
        const restoredQty = stockRows[0].Quantity + old.Quantity;

        await conn.execute(
          `UPDATE stock SET Quantity = ? WHERE Id = ?`,
          [restoredQty, stockRows[0].Id]
        );
      }
    }

    // Step 3: Validate new prod_details quantities BEFORE inserting
    for (const detail of prod_details) {
      // Defensive: convert undefined to null for Prod_Id and Quantity
      const prodId = safe(detail.Prod_Id);
      const qty = safe(detail.Quantity);
      // 

      if (prodId === null || qty === null) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: "Invalid product details",
          details: "Product ID and Quantity are required for each product"
        });
      }

      const [stockRows] = await conn.execute(
        `SELECT Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [prodId]
      );

      if (stockRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: "Invalid product",
          details: `Product ID ${prodId} not found in stock`
        });
      }

      const availableQty = stockRows[0].Quantity;

      if (availableQty < qty) {
        // Stop here if any quantity is too large
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: "Please check product quantities",
          details: `Insufficient stock for product ID ${prodId}`
        });
      }
    }

    // Step 4: Delete old product_sold_details for this Invoice_No or Delivery_Challan
    await conn.execute(
      `DELETE FROM product_sold_details WHERE (Invoice_No = ? OR Delivery_Challan = ?)`,
      [oldInvoiceNo, oldDeliveryChallan]
    );

    // Step 5: Update stock_out table
    await conn.execute(
      `UPDATE stock_out 
       SET Comp_Id = ?, To_Address = ?, Invoice_No = ?, Invoice_Date = ?, Delivery_Challan = ?, Purpose = ?, Packing_By = ?, Checking_By = ?, Delivery_By = ?, Active = ?, Modified_By = ?, Modified_On = ?
       WHERE Id = ?`,
      [
        Comp_Id,
        To_Address,
        Invoice_No,
        Invoice_Date,
        Delivery_Challan,
        Purpose,
        Packing_By,
        Checking_By,
        Delivery_By,
        Active,
        Modified_By,
        Modified_On,
        id
      ]
    );

    // Step 6: Insert new product_sold_details and update stock
    for (const detail of prod_details) {
      const prodId = safe(detail.Prod_Id);
      const qty = safe(detail.Quantity);
      const remarks = safe(detail.Remarks);

      await conn.execute(
        `INSERT INTO product_sold_details (Invoice_No, Delivery_Challan, Prod_Id, Quantity, Remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [Invoice_No, Delivery_Challan, prodId, qty, remarks]
      );

      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [prodId]
      );

      const existingQty = stockRows[0].Quantity;
      const updatedQty = existingQty - qty;

      await conn.execute(
        `UPDATE stock SET Quantity = ? WHERE Id = ?`,
        [updatedQty, stockRows[0].Id]
      );
    }

    await conn.commit();
    conn.release();

    res.status(200).json({ message: "Stock-out updated successfully." });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    try { conn.release(); } catch (e) {}
    // If the error is about undefined bind parameters, give a more helpful message
    if (
      err &&
      typeof err.message === "string" &&
      err.message.includes("Bind parameters must not contain undefined")
    ) {
      return res.status(500).json({
        error: "Error updating stock-out record",
        details: "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
      });
    }
    res.status(500).json({
      error: "Error updating stock-out record",
      details: err.message
    });
  }
});

// TOGGLE Active State for Stock Out
app.post('/stock-out/toggle', async (req, res) => {
  const { id } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Get current Active status, Invoice_No, and Delivery_Challan
    const [stockOutRows] = await conn.execute(
      `SELECT Active, Invoice_No, Delivery_Challan FROM stock_out WHERE Id = ?`,
      [id]
    );

    if (stockOutRows.length === 0) {
      throw new Error("Stock-out record not found");
    }

    const currentActive = stockOutRows[0].Active;
    const invoiceNo = stockOutRows[0].Invoice_No;
    const deliveryChallan = stockOutRows[0].Delivery_Challan;
    const isDeactivating = currentActive === 1;

    // 2. Get product_sold_details for this stock_out (by Invoice_No or Delivery_Challan)
    const [productDetails] = await conn.execute(
      `SELECT Prod_Id, Quantity FROM product_sold_details WHERE (Invoice_No = ? OR Delivery_Challan = ?)`,
      [invoiceNo, deliveryChallan]
    );

    for (const item of productDetails) {
      const [stockRows] = await conn.execute(
        `SELECT Id, Quantity FROM stock WHERE Prod_Id = ? FOR UPDATE`,
        [item.Prod_Id]
      );

      if (stockRows.length === 0) {
        throw new Error(`Stock entry not found for product ID ${item.Prod_Id}`);
      }

      const stockId = stockRows[0].Id;
      const currentQty = stockRows[0].Quantity;

      if (isDeactivating) {
        // Restore stock
        const updatedQty = currentQty + item.Quantity;
        await conn.execute(
          `UPDATE stock SET Quantity = ? WHERE Id = ?`,
          [updatedQty, stockId]
        );
      } else {
        // Subtract stock again only if enough stock available
        if (currentQty < item.Quantity) {
          throw new Error(`Insufficient stock for product ID ${item.Prod_Id}`);
        }
        const updatedQty = currentQty - item.Quantity;
        await conn.execute(
          `UPDATE stock SET Quantity = ? WHERE Id = ?`,
          [updatedQty, stockId]
        );
      }
    }

    // 3. Toggle active status
    await conn.execute(
      `UPDATE stock_out SET Active = NOT Active WHERE Id = ?`,
      [id]
    );

    await conn.commit();

    // 4. Fetch updated data for this stock_out entry and its details (like /stock-out)
    const [rows] = await conn.execute(
      `
      SELECT 
        so.Id AS stock_id,
        so.Invoice_No,
        so.Invoice_Date,
        so.Delivery_Challan,
        so.Purpose,
        so.Comp_Id,
        cm.Company,
        cm.Address,
        so.To_Address,
        so.Packing_By, 
        so.Checking_By, 
        so.Delivery_By,
        so.Created_By,
        so.Active,

        pod.Id AS details_id,
        pod.Prod_Id,
        pod.Remarks,
        pm.Product_name,
        pm.Model_no,
        pm.Cost_price,
        pm.Whouse_Id,
        wm.Name,
        pm.Make_Id,
        mm.Make,
        pod.Quantity,
        pm.Unit_Id,
        um.Unit

      FROM stock_out so
      JOIN product_sold_details pod 
        ON (pod.Invoice_No = so.Invoice_No OR pod.Delivery_Challan = so.Delivery_Challan)
      JOIN company_master cm 
        ON cm.Id = so.Comp_Id
      JOIN product_master pm 
        ON pm.Id = pod.Prod_Id
      JOIN make_master mm 
        ON mm.Id = pm.Make_Id
      JOIN unit_master um 
        ON um.Id = pm.Unit_Id
      JOIN warehouse wm 
        ON wm.Id = pm.Whouse_Id
      WHERE so.Id = ?
      ORDER BY pod.Invoice_No DESC, pod.Delivery_Challan DESC
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Stock-out entry not found" });
    }

    // Grouping logic as in /stock-out
    const groupKey = `${rows[0].stock_id}_${rows[0].Invoice_No}`;

    function formatDateToYMD(date) {
      if (!date) return null;
      // Accepts both Date and string
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const grouped = {};
    for (const row of rows) {
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          Id: row.stock_id,
          Invoice_No: row.Invoice_No,
          Invoice_Date: formatDateToYMD(row.Invoice_Date),
          Comp_Id: row.Comp_Id,
          Delivery_Challan: row.Delivery_Challan,
          Purpose: row.Purpose,
          Company: row.Company,
          Address: row.Address,
          To_Address: row.To_Address,
          Packing_By: row.Packing_By,
          Checking_By: row.Checking_By,
          Delivery_By: row.Delivery_By,
          Created_By: row.Created_By,
          Active: row.Active,
          Total_Quantity: 0,
          Total_Price: 0,
          prod_details: [],
          Make: '',
        };
      }
      grouped[groupKey].prod_details.push({
        Id: row.details_id,
        Prod_Id: row.Prod_Id,
        Product_name: row.Product_name,
        Model_no: row.Model_no,
        Cost_price: row.Cost_price,
        Whouse_Id: row.Whouse_Id,
        Name: row.Name,
        Make_Id: row.Make_Id,
        Make: row.Make,
        Quantity: row.Quantity,
        Unit_Id: row.Unit_Id,
        Unit: row.Unit,
        Remarks: row.Remarks,
      });
      grouped[groupKey].Total_Quantity += row.Quantity;
      grouped[groupKey].Total_Price += row.Cost_price * row.Quantity;
    }
    // Compose Make string
    const makes = grouped[groupKey].prod_details
      .map(p => p.Make)
      .filter((v, i, a) => v && a.indexOf(v) === i);
    grouped[groupKey].Make = makes.join(', ');
    grouped[groupKey].Total_Price = Number(grouped[groupKey].Total_Price).toFixed(2);
    const formatted = grouped[groupKey];

    conn.release();
    res.json(formatted);

  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

////////////V V IMPORTANT V V/////////////

// LIST Make
app.get('/make', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM make_master`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching products', details: err.message });
  }
});

//Create Make
app.post('/make/create', async (req, res) => {
  const { Make, Address, Cont_Person, Cont_No, Gstin, Created_By, Active, } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO make_master (Make, Address, Cont_Person, Cont_No, Gstin, Created_By, Active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [Make, Address, Cont_Person, Cont_No, Gstin, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Make,
      Address,
      Cont_Person,
      Cont_No,
      Gstin,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating product', details: err.message });
  }
});

//Update Make
app.put('/make/:id', async (req, res) => {
  const { id } = req.params;
  const { Make, Address, Cont_Person, Gstin, Cont_No, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE make_master SET Make = ?, Address = ?, Cont_Person = ?, Cont_No = ?, Gstin = ?, Modified_By = ? WHERE Id = ?`,
      [Make, Address, Cont_Person, Cont_No, Gstin, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM make_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating product', details: err.message });
  }
});

// TOGGLE Active State for Make
app.post('/make/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE make_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM make_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

//Make Helper
app.get('/make-helper', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Make FROM make_master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching makes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/state-helper', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM states WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/country-helper', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM countries WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('/defective', async (req, res) => {
  const makeId = req.query.makeId;
  const pCat_Id = req.query.pCat_Id;
  const Whouse_Id = req.query.Whouse_Id;

  let whereClauses = [];
  let params = [];

  if (makeId) {
    whereClauses.push('pm.Make_Id = ?');
    params.push(makeId);
  }

  if (pCat_Id) {
    whereClauses.push('pm.PCat_Id = ?');
    params.push(pCat_Id);
  }

  if (Whouse_Id) {
    whereClauses.push('pm.Whouse_Id = ?');
    params.push(Whouse_Id);
  }

  whereClauses.push('pm.Active = 1');
  const whereClauseString = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const query = `
    SELECT 
      ms.Id, ms.Prod_Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, ms.Quantity,
      pm.Unit_Id, um.Unit, pm.Cost_Price, pm.Whouse_Id, wm.Name, pm.PCat_Id, pcm.Category, pm.HSNCode
    FROM stock_management.defective_items AS ms
    LEFT JOIN product_master AS pm ON ms.Prod_Id = pm.Id
    LEFT JOIN make_master AS mm ON pm.Make_Id = mm.Id
    LEFT JOIN unit_master AS um ON pm.Unit_Id = um.Id
    LEFT JOIN warehouse AS wm ON pm.Whouse_Id = wm.Id
    LEFT JOIN product_category_master AS pcm ON pm.PCat_Id = pcm.Id
    ${whereClauseString}
  `;

  try {
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// For Dashboard Stock Table Get all
app.get('/stock-dashboard', async (req, res) => {

  // const Whouse_Id = req.query.Whouse_Id;
  // let whereClauses = [];
  // let params = [];

  // if (Whouse_Id) {
  //   whereClauses.push('pm.Whouse_Id = ?');
  //   params.push(Whouse_Id);
  // }

  // const whereClauseString = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const query = `
SELECT 
  ms.Id, 
  ms.Prod_Id, 
  pm.Product_name, 
  pm.Model_no, 
  pm.Make_Id, 
  mm.Make, 
  ms.Quantity, 
  pm.Unit_Id, 
  um.Unit, 
  pm.Cost_Price, 
  pcm.Category,
  pm.Whouse_Id,
  wm.Name
FROM stock_management.stock AS ms
JOIN product_master AS pm ON ms.Prod_Id = pm.Id
JOIN make_master AS mm ON pm.Make_Id = mm.Id
JOIN unit_master AS um ON pm.Unit_Id = um.Id
JOIN warehouse AS wm ON pm.Whouse_Id = wm.Id
LEFT JOIN product_category_master AS pcm ON pm.PCat_Id = pcm.Id AND pm.PCat_Id != 0

`;

  try {
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

//For Dashboard Stock In table
app.get('/stock-in-dashboard', async (req, res) => {

  const query = `
 SELECT si.Id, si.Purchase_Order, si.Purchase_Date,  si.Is_Return,si.Credit_No, si.Credit_Date, si.Org_InvNo, si.Org_Invdt,ppd.Prod_Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, pm.Cost_Price, ppd.Quantity, si.Created_By, si.Created_On from stock_in si 
JOIN product_purchase_details ppd 
        ON ppd.Purchase_Order = si.Purchase_Order 
        OR (ppd.Credit_No IS NOT NULL AND ppd.Credit_No = si.Org_InvNo)
    join product_master pm on pm.Id = ppd.Prod_Id
      join make_master mm on mm.Id = pm.Make_Id where si.Active = 1;
`;

  try {
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

//For Dashboard Stock Out table
app.get('/stock-out-dashboard', async (req, res) => {

  const query = `
 SELECT si.Id, si.Invoice_No, si.Invoice_Date, si.Delivery_Challan, si.Purpose, pod.Prod_Id, pm.Product_name, pm.Model_no, pm.Make_Id, mm.Make, pm.Cost_Price, pod.Quantity, si.Created_By, si.Created_On from stock_out si 
 JOIN product_sold_details pod 
    ON pod.Invoice_No = si.Invoice_No OR pod.Delivery_Challan = si.Delivery_Challan
    join product_master pm on pm.Id = pod.Prod_Id
      join make_master mm on mm.Id = pm.Make_Id where si.Active = 1;
`;

  try {
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// LIST Company
app.get('/company', async (req, res) => {
  const { cat_Id, type_Id, region_Id, Created_By } = req.query;

  // Build dynamic WHERE clause and params array
  let whereClauses = [];
  let params = [];

  if (cat_Id) {
    whereClauses.push('cm.Cat_Id = ?');
    params.push(cat_Id);
  }
  if (type_Id) {
    whereClauses.push('cm.Type_Id = ?');
    params.push(type_Id);
  }
  if (region_Id) {
    whereClauses.push('cm.Region_Id = ?');
    params.push(region_Id);
  }
  // if (Created_On) {
  //   whereClauses.push('DATE(cm.Created_On) = ?');
  //   params.push(Created_On);
  // }
  if (Created_By) {
    whereClauses.push('cm.Created_By = ?');
    params.push(Created_By);
  }

  const whereString = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const [rows] = await pool.execute(`
      Select cm.Id, cm.Company, cm.Address, cm.Cat_Id, catm.Category, cm.Region_Id, regm.Region, cm.Type_Id, cm.Website, cm.Pan, cm.Gstin, cm.Internal_Note, typm.Type, cm.Active
      from stock_management.company_master as cm
      inner join stock_management.category_master as catm on cm.Cat_Id = catm.id
      inner join stock_management.region_master as regm on cm.Region_Id = regm.id
      inner join stock_management.type_master as typm on cm.Type_Id = typm.id
      ${whereString}
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching Companies', details: err.message });
  }
});

//Create Company
app.post('/company/create', async (req, res) => {
  const { Company, Address, Cat_Id, Region_Id, Type_Id, Created_By, Created_On, Website, Pan, Gstin, Internal_Note, Active } = req.body;
  try {
    // Check for duplicate Company, Website, Pan, Gstin (case-insensitive, treat null/empty as '')
    const [dupRows] = await pool.execute(
      `SELECT Id FROM Company_master 
       WHERE LOWER(TRIM(Company)) = LOWER(TRIM(?))
         OR (COALESCE(NULLIF(TRIM(Website),''), '') <> '' AND LOWER(TRIM(Website)) = LOWER(TRIM(?)))
         OR (COALESCE(NULLIF(TRIM(Pan),''), '') <> '' AND LOWER(TRIM(Pan)) = LOWER(TRIM(?)))
         OR (COALESCE(NULLIF(TRIM(Gstin),''), '') <> '' AND LOWER(TRIM(Gstin)) = LOWER(TRIM(?)))`,
      [
        Company || '',
        Website || '',
        Pan || '',
        Gstin || ''
      ]
    );
    if (dupRows.length > 0) {
      // Duplicate found
      return res.status(409).json({
        error: 'Duplicate company data',
        message: 'Duplicate company data'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO Company_master (Company, Address, Cat_Id, Region_Id, Type_Id, Created_By, Created_On, Website, Pan, Gstin, Internal_Note, Active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [Company, Address, Cat_Id, Region_Id, Type_Id, Created_By, Created_On, Website, Pan, Gstin, Internal_Note, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Company,
      Address,
      Cat_Id,
      Region_Id,
      Type_Id,
      Created_By,
      Created_On,
      Website,
      Pan,
      Gstin,
      Internal_Note,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Companies', details: err.message });
  }
});

//Update Company
app.put('/company/:id', async (req, res) => {
  const { id } = req.params;
  const { Company, Modified_By, Address, Cat_Id, Region_Id, Type_Id, Website, Pan, Gstin, Internal_Note, Modified_On } = req.body;

  try {
    // Check for duplicate Company, Website, Pan, Gstin (excluding current id)
    const [dupRows] = await pool.execute(
      `SELECT Id FROM Company_master 
       WHERE (LOWER(TRIM(Company)) = LOWER(TRIM(?))
              OR (COALESCE(NULLIF(TRIM(Website),''), '') <> '' AND LOWER(TRIM(Website)) = LOWER(TRIM(?)))
              OR (COALESCE(NULLIF(TRIM(Pan),''), '') <> '' AND LOWER(TRIM(Pan)) = LOWER(TRIM(?)))
              OR (COALESCE(NULLIF(TRIM(Gstin),''), '') <> '' AND LOWER(TRIM(Gstin)) = LOWER(TRIM(?))))
         AND Id <> ?`,
      [
        Company || '',
        Website || '',
        Pan || '',
        Gstin || '',
        id
      ]
    );
    if (dupRows.length > 0) {
      // Duplicate found
      return res.status(409).json({
        error: 'Duplicate company data',
        message: 'Duplicate company data'
      });
    }

    await pool.execute(
      `UPDATE Company_master SET Company = ?, Address = ?, Cat_Id = ?,  Region_Id = ?,  Type_Id = ?, Website = ?, Pan = ?, Gstin = ?, Internal_Note = ?, Modified_By = ?, Modified_On = ?   WHERE Id = ?`,
      [Company, Address, Cat_Id, Region_Id, Type_Id, Website, Pan, Gstin, Internal_Note, Modified_By, Modified_On, id]
    );

    const [rows] = await pool.execute(`SELECT 
        cm.Id, cm.Company, cm.Address, cm.Cat_Id, catm.Category, 
        cm.Region_Id, regm.Region, cm.Type_Id, cm.Website, cm.Pan, cm.Gstin, cm.Internal_Note, typm.Type, cm.Active
      FROM stock_management.company_master AS cm
      INNER JOIN stock_management.category_master AS catm ON cm.Cat_Id = catm.id
      INNER JOIN stock_management.region_master AS regm ON cm.Region_Id = regm.id
      INNER JOIN stock_management.type_master AS typm ON cm.Type_Id = typm.id
      WHERE cm.Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating product', details: err.message });
  }
});

// TOGGLE Active State for Company
app.post('/company/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Company_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT 
      cm.Id, cm.Company, cm.Address, cm.Cat_Id, catm.Category, 
      cm.Region_Id, regm.Region, cm.Type_Id, cm.Website, cm.Pan, cm.Gstin, cm.Internal_Note, typm.Type, cm.Active
    FROM stock_management.company_master AS cm
    INNER JOIN stock_management.category_master AS catm ON cm.Cat_Id = catm.id
    INNER JOIN stock_management.region_master AS regm ON cm.Region_Id = regm.id
    INNER JOIN stock_management.type_master AS typm ON cm.Type_Id = typm.id
    WHERE cm.Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});



// LIST Users
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      
SELECT 
  usm.id, 
  usm.username, 
  usm.name, 
  usm.password, 
  dept.department AS department,
  role.Role as role,
  usm.Active
FROM users AS usm
LEFT JOIN department_master AS dept
ON usm.dept_Id = dept.id
LEFT JOIN role_master AS role
on usm.Role_Id = role.Id

      
      `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching Users', details: err.message });
  }
});

//Create Users
app.post('/users/create', async (req, res) => {
  // Accept both camelCase and PascalCase for compatibility
  let { username, name, password, Dept_Id, dept_Id, Role_Id, role_id, Active } = req.body;

  // Normalize field names: prefer Dept_Id/Role_Id, fallback to dept_Id/role_id
  if (Dept_Id === undefined && dept_Id !== undefined) Dept_Id = dept_Id;
  if (Role_Id === undefined && role_id !== undefined) Role_Id = role_id;

  // Convert undefined to null for SQL compatibility
  const safeUsername = username !== undefined ? username : null;
  const safename = name !== undefined ? name : null;
  const safePassword = password !== undefined ? password : null;
  const safeDeptId = Dept_Id !== undefined ? Dept_Id : null;
  const safeRoleId = Role_Id !== undefined ? Role_Id : null;
  const safeActive = Active !== undefined ? (Active ? 1 : 0) : 0;

  try {
    const [result] = await pool.execute(
      `INSERT INTO Users (username, name, password, Dept_Id, Role_Id, Active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [safeUsername, safename, safePassword, safeDeptId, safeRoleId, safeActive]
    );
    res.status(201).json({
      id: result.insertId,
      username: safeUsername,
      name: safename,
      password: safePassword,
      Dept_Id: safeDeptId,
      Role_Id: safeRoleId,
      Active: !!safeActive
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Users', details: err.message });
  }
});

//Update Users
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  // Accept both camelCase and PascalCase for compatibility
  let { username, name, password, Dept_Id, dept_Id, Role_Id, role_id } = req.body;

  // Normalize field names: prefer Dept_Id/Role_Id, fallback to dept_Id/role_id
  if (Dept_Id === undefined && dept_Id !== undefined) Dept_Id = dept_Id;
  if (Role_Id === undefined && role_id !== undefined) Role_Id = role_id;

  // Convert undefined to null for SQL compatibility
  const safeUsername = username !== undefined ? username : null;
  const safename = name !== undefined ? name : null;
  const safePassword = password !== undefined ? password : null;
  const safeDeptId = Dept_Id !== undefined ? Dept_Id : null;
  const safeRoleId = Role_Id !== undefined ? Role_Id : null;

  try {
    await pool.execute(
      `UPDATE Users SET username = ?, name = ?, password = ?, Dept_Id = ?, Role_Id = ? WHERE Id = ?`,
      [safeUsername, safename, safePassword, safeDeptId, safeRoleId, id]
    );

    const [rows] = await pool.execute(`SELECT 
      usm.id, 
      usm.username, 
      usm.name, 
      usm.password, 
      dept.department AS department,
      role.role as role,
      usm.Active
      FROM users AS usm
      LEFT JOIN department_master AS dept
      ON usm.Dept_Id = dept.id
      LEFT JOIN role_master AS role
      on usm.Role_Id = role.Id WHERE usm.id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Users', details: err.message });
  }
});

// TOGGLE Active State for Users
app.post('/users/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Users SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT 
  usm.id, 
  usm.username, 
  usm.name, 
  usm.password, 
  dept.department AS department,
  role.Role as role,
  usm.Active
FROM users AS usm
LEFT JOIN department_master AS dept
ON usm.dept_Id = dept.id
LEFT JOIN role_master AS role
on usm.Role_Id = role.Id WHERE usm.id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// LIST Customer
app.get('/customer', async (req, res) => {
  // Now also accept Created_On and Modified_On as query params
  const { cat_Id, type_Id, region_Id, Created_By } = req.query;

  let query = `
    SELECT 
      cm.Id, 
      cm.Code, 
      cm.Comp_Id, 
      comp.Company, 
      comp.Address,  
      cm.Contact_person, 
      cm.mobile_no, 
      cm.emailid, 
      comp.Cat_Id, 
      catm.Category, 
      comp.Type_Id, 
      typm.Type, 
      comp.Region_Id, 
      regm.Region,
      cm.Salut_Id, 
      sal.Salutation, 
      cm.Desig_Id, 
      desm.Designation, 
      cm.Reference, 
      cm.Active,
      cm.Created_On,
      cm.Modified_On
    FROM Customer_master AS cm
    LEFT JOIN Company_master AS comp ON cm.Comp_Id = comp.Id
    LEFT JOIN Category_master AS catm ON comp.Cat_Id = catm.Id
    LEFT JOIN Type_master AS typm ON comp.Type_Id = typm.Id
    LEFT JOIN Region_master AS regm ON comp.Region_Id = regm.Id
    LEFT JOIN Salutation_master AS sal ON cm.Salut_Id = sal.Id
    LEFT JOIN Designation_master AS desm ON cm.Desig_Id = desm.Id
  `;

  const conditions = [];
  const params = [];

  // Filter logic: cat_Id = Category, type_Id = Type, region_Id = Region, Created_On, Modified_On
  if (cat_Id) {
    conditions.push(`comp.Cat_Id = ?`);
    params.push(cat_Id);
  }
  if (type_Id) {
    conditions.push(`comp.Type_Id = ?`);
    params.push(type_Id);
  }
  if (region_Id) {
    conditions.push(`comp.Region_Id = ?`);
    params.push(region_Id);
  }
  if (Created_By) {
    conditions.push(`cm.Created_By = ?`);
    params.push(Created_By);
  }
  // if (Created_On) {
  //   conditions.push(`DATE(cm.Created_On) = ?`);
  //   params.push(Created_On);
  // }


  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  try {
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});
//Create Customer

app.post('/customer/create', async (req, res) => {
  const {
    Comp_Id,
    Salut_Id,
    Desig_Id,
    Contact_person,
    Mobile_no,
    EmailId,
    Reference,
    Created_By,
    Created_On,
    Active
  } = req.body;

  // Basic validation for required fields
  if (!Comp_Id || !Desig_Id || !Contact_person || !Mobile_no || !EmailId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Get the Cat_Id for the given Comp_Id (do not save Cat_Id in Customer_master)
    const [companyRows] = await pool.execute(
      `SELECT Cat_Id FROM Company_master WHERE Id = ?`,
      [Comp_Id]
    );
    if (!companyRows || companyRows.length === 0) {
      return res.status(400).json({ error: 'Invalid Company ID' });
    }
    const Cat_Id = companyRows[0].Cat_Id;

    // Check for duplicate Contact_person, Mobile_no, EmailId, Desig_Id
    const [dupRows] = await pool.execute(
      `SELECT Id FROM Customer_master 
       WHERE 
         (Contact_person = ? OR Mobile_no = ? OR EmailId = ? OR Desig_Id = ?)
         AND Comp_Id = ?`,
      [Contact_person, Mobile_no, EmailId, Desig_Id, Comp_Id]
    );
    if (dupRows.length > 0) {
      return res.status(409).json({
        error: 'Duplicate customer data',
        message: 'Contact Person, Mobile No, Email ID, or Designation already exists for this company.'
      });
    }

    // Define prefix map for code generation
    const categoryPrefixMap = {
      1: 'H', // HVAC
      2: 'F', // FIRE
      3: 'P', // PEB
      4: 'I'  // INDUSTRY
    };

    const prefix = categoryPrefixMap[Cat_Id];
    if (!prefix) {
      return res.status(400).json({ error: 'Invalid Category ID' });
    }

    // Get latest code for this category
    const [rows] = await pool.execute(
      `SELECT custm.Code FROM
customer_master as custm
inner join
company_master as cm
on custm.comp_Id = cm.Id
inner join category_master as catm
on cm.Cat_Id = catm.id
 WHERE cm.Cat_Id = ? AND Code LIKE ? ORDER BY Code DESC LIMIT 1`,
      [Cat_Id, `${prefix}%`]
    );

    let nextCode;
    if (rows.length > 0) {
      // extract number from last code and increment
      const lastCode = rows[0].Code; // e.g., H000012
      const lastNumber = parseInt(lastCode.slice(1)); // remove prefix
      nextCode = `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
    } else {
      // first code
      nextCode = `${prefix}000001`;
    }

    // Insert customer (do NOT save Cat_Id)
    const [result] = await pool.execute(
      `INSERT INTO Customer_master (
        Code,
        Comp_Id,
        Salut_Id,
        Desig_Id,
        Contact_person,
        Mobile_no,
        EmailId,
        Reference,
        Created_By,
        Created_On,
        Active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextCode,
        Comp_Id,
        Salut_Id,
        Desig_Id,
        Contact_person,
        Mobile_no,
        EmailId,
        Reference,
        Created_By,
        Created_On,
        Active ? 1 : 0
      ]
    );

    res.status(201).json({
      Id: result.insertId,
      Code: nextCode,
      Comp_Id,
      Salut_Id,
      Desig_Id,
      Contact_person,
      Mobile_no,
      EmailId,
      Reference,
      Created_By,
      Created_On,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Customers', details: err.message });
  }
});

//Update Customer

app.put('/customer/:id', async (req, res) => {
  const { id } = req.params;
  const {
    // Code,
    Comp_Id,
    Salut_Id,
    Desig_Id,
    Contact_person,
    Mobile_no,
    EmailId,
    Reference,
    Modified_By,
    Modified_On
  } = req.body;

  // Basic validation for required fields
  if (!Comp_Id || !Desig_Id || !Contact_person || !Mobile_no || !EmailId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Check for duplicate Contact_person, Mobile_no, EmailId, Desig_Id (excluding current id)
    const [dupRows] = await pool.execute(
      `SELECT Id FROM Customer_master 
       WHERE 
         (Contact_person = ? OR Mobile_no = ? OR EmailId = ? OR Desig_Id = ?)
         AND Comp_Id = ?
         AND Id <> ?`,
      [Contact_person, Mobile_no, EmailId, Desig_Id, Comp_Id, id]
    );
    if (dupRows.length > 0) {
      return res.status(409).json({
        error: 'Duplicate customer data',
        message: 'Contact Person, Mobile No, Email ID, or Designation already exists for this company.'
      });
    }

    // Handle undefined values to avoid bind errors
    const values = [
      // Code ?? null,
      Comp_Id ?? null,
      Salut_Id ?? null,
      Desig_Id ?? null,
      Contact_person ?? null,
      Mobile_no ?? null,
      EmailId ?? null,
      Reference ?? null,
      Modified_By ?? null,
      Modified_On,
      id
    ];

    await pool.execute(
      `UPDATE Customer_master SET 
        Comp_Id = ?,
        Salut_Id = ?,
        Desig_Id = ?,
        Contact_person = ?,
        Mobile_no = ?,
        EmailId = ?,
        Reference = ?,
        Modified_By = ?,
        Modified_On = ?
      WHERE Id = ?`,
      values
    );

    const [rows] = await pool.execute(`
     SELECT 
      cm.Id, 
      cm.Code, 
      cm.Comp_Id, 
      comp.Company, 
      comp.Address,  
      cm.Contact_person, 
      cm.mobile_no, 
      cm.emailid, 
      comp.Cat_Id, 
      catm.Category, 
      comp.Type_Id, 
      typm.Type, 
      comp.Region_Id, 
      regm.Region,
      cm.Salut_Id, 
      sal.Salutation, 
      cm.Desig_Id, 
      desm.Designation, 
      cm.Reference, 
      cm.Active,
      cm.Created_On,
      cm.Modified_On
    FROM Customer_master AS cm
    LEFT JOIN Company_master AS comp ON cm.Comp_Id = comp.Id
    LEFT JOIN Category_master AS catm ON comp.Cat_Id = catm.Id
    LEFT JOIN Type_master AS typm ON comp.Type_Id = typm.Id
    LEFT JOIN Region_master AS regm ON comp.Region_Id = regm.Id
    LEFT JOIN Salutation_master AS sal ON cm.Salut_Id = sal.Id
    LEFT JOIN Designation_master AS desm ON cm.Desig_Id = desm.Id
      WHERE cm.Id = ?`,
      [id]
    );

    res.json(rows[0]); // Return updated customer
  } catch (err) {
    res.status(500).json({ error: 'Error updating customer', details: err.message });
  }
});

// TOGGLE Active State for Customer
app.post('/customer/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Customer_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT 
      cm.Id, 
      cm.Code, 
      cm.Comp_Id, 
      comp.Company, 
      comp.Address,  
      cm.Contact_person, 
      cm.mobile_no, 
      cm.emailid, 
      comp.Cat_Id, 
      catm.Category, 
      comp.Type_Id, 
      typm.Type, 
      comp.Region_Id, 
      regm.Region,
      cm.Salut_Id, 
      sal.Salutation, 
      cm.Desig_Id, 
      desm.Designation, 
      cm.Reference, 
      cm.Active,
      cm.Created_On,
      cm.Modified_On
    FROM Customer_master AS cm
    LEFT JOIN Company_master AS comp ON cm.Comp_Id = comp.Id
    LEFT JOIN Category_master AS catm ON comp.Cat_Id = catm.Id
    LEFT JOIN Type_master AS typm ON comp.Type_Id = typm.Id
    LEFT JOIN Region_master AS regm ON comp.Region_Id = regm.Id
    LEFT JOIN Salutation_master AS sal ON cm.Salut_Id = sal.Id
    LEFT JOIN Designation_master AS desm ON cm.Desig_Id = desm.Id where cm.Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper for Users
app.get('/user-helper', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT name from Users WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dropdown helper and Get All for Region
app.get('/region', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Region, Active FROM Region_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Region
app.post('/region/create', async (req, res) => {
  const { Region, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Region_master (Region, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Region, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Region,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Region', details: err.message });
  }
});

//Update Region
app.put('/region/:id', async (req, res) => {
  const { id } = req.params;
  const { Region, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Region_master SET Region = ?, Modified_By = ? WHERE Id = ?`,
      [Region, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Region_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating region', details: err.message });
  }
});

// TOGGLE Active State for Region
app.post('/region/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Region_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Region_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper And Get all for Department
app.get('/department', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Department, Active FROM Department_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Department
app.post('/department/create', async (req, res) => {
  const { Department, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Department_master (Department, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Department, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Department,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Department', details: err.message });
  }
});

//Update Department
app.put('/department/:id', async (req, res) => {
  const { id } = req.params;
  const { Department, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Department_master SET Department = ?, Modified_By = ? WHERE Id = ?`,
      [Department, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Department_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Department', details: err.message });
  }
});

// TOGGLE Active State for Department
app.post('/department/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Department_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Department_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper and Get All for Category
app.get('/category', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Category, Active FROM Category_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Category
app.post('/category/create', async (req, res) => {
  const { Category, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Category_master (Category, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Category, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Category,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Category', details: err.message });
  }
});

//Update Category
app.put('/category/:id', async (req, res) => {
  const { id } = req.params;
  const { Category, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Category_master SET Category = ?, Modified_By = ? WHERE Id = ?`,
      [Category, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Category_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Category', details: err.message });
  }
});

// TOGGLE Active State for Category
app.post('/category/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Category_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Category_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper and Get All for Product Category
app.get('/warehouse', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM warehouse WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Product Category
app.post('/warehouse/create', async (req, res) => {
  const { Name, Manager, Location, Phone, Created_By, Created_On, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO warehouse (Name, Manager, Location, Phone, Created_By, Created_On ,Active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [Name, Manager, Location, Phone, Created_By, Created_On, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Name, Manager, Location, Phone,
      Created_By,
      Created_On,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating product category', details: err.message });
  }
});

//Update Product Category
app.put('/warehouse/:id', async (req, res) => {
  const { id } = req.params;
  const { Name, Manager, Location, Phone, Modified_By, Modified_On } = req.body;

  try {
    await pool.execute(
      `UPDATE warehouse SET Name = ?, Manager = ?, Location = ?, Phone = ?, Modified_By = ?, Modified_On = ? WHERE Id = ?`,
      [Name, Manager, Location, Phone, Modified_By, Modified_On, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM warehouse WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating product category', details: err.message });
  }
});

// TOGGLE Active State for Product Category
app.post('/warehouse/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE warehouse SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM warehouse WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

app.get('/user-role', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM role_master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Product Categories by Make_Id
app.post('/product-category-helper', async (req, res) => {
  const { make_Id } = req.body;

  if (make_Id == null) {
    return res.status(400).json({ error: 'make_Id is required' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT pcm.Id, pcm.Category, pcm.Make_Id, mm.Make, pcm.Active
       FROM product_category_master pcm
       JOIN make_master mm ON pcm.Make_Id = mm.Id
       WHERE pcm.Active = 1 and pcm.Make_Id = ?`,
      [make_Id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Get All for Product Category
app.get('/product-category', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT pcm.Id, pcm.Category, pcm.Make_Id, mm.Make, pcm.Active 
      FROM product_category_master pcm join make_master mm on pcm.Make_Id = mm.Id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Product Category
app.post('/product-category/create', async (req, res) => {
  const { Category, Make_Id, Created_By, Created_On, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO product_category_master (Category, Make_Id, Created_By, Created_On ,Active)
       VALUES (?, ?, ?, ?, ?)`,
      [Category, Make_Id, Created_By, Created_On, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Category,
      Make_Id,
      Created_By,
      Created_On,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating product category', details: err.message });
  }
});

//Update Product Category
app.put('/product-category/:id', async (req, res) => {
  const { id } = req.params;
  const { Category, Make_Id, Modified_By, Modified_On } = req.body;

  try {
    await pool.execute(
      `UPDATE product_category_master SET Category = ?, Make_Id = ?, Modified_By = ?, Modified_On = ? WHERE Id = ?`,
      [Category, Make_Id, Modified_By, Modified_On, id]
    );

    const [rows] = await pool.execute(`SELECT pcm.Id, pcm.Category, pcm.Make_Id, mm.Make, pcm.Active 
      FROM product_category_master pcm join make_master mm on pcm.Make_Id = mm.Id WHERE pcm.Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating product category', details: err.message });
  }
});

// TOGGLE Active State for Product Category
app.post('/product-category/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE product_category_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT pcm.Id, pcm.Category, pcm.Make_Id, mm.Make, pcm.Active 
      FROM product_category_master pcm join make_master mm on pcm.Make_Id = mm.Id WHERE pcm.Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper and Get All for Salutation
app.get('/salutation', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Salutation, Active FROM Salutation_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching salutations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Salutation
app.post('/salutation/create', async (req, res) => {
  const { Salutation, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Salutation_master (Salutation, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Salutation, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Salutation,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Salutation', details: err.message });
  }
});

//Update Salutation
app.put('/salutation/:id', async (req, res) => {
  const { id } = req.params;
  const { Salutation, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Salutation_master SET Salutation = ?, Modified_By = ? WHERE Id = ?`,
      [Salutation, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Salutation_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Salutation', details: err.message });
  }
});

// TOGGLE Active State for Salutation
app.post('/salutation/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Salutation_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Salutation_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper and Get All for Type
app.get('/type', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Type, Active FROM Type_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Type
app.post('/type/create', async (req, res) => {
  const { Type, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Type_master (Type, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Type, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Type,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Type', details: err.message });
  }
});

//Update Type
app.put('/type/:id', async (req, res) => {
  const { id } = req.params;
  const { Type, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Type_master SET Type = ?, Modified_By = ? WHERE Id = ?`,
      [Type, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Type_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Type', details: err.message });
  }
});

// TOGGLE Active State for Type
app.post('/type/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Type_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Type_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Dropdown helper and Get All for Designations
app.get('/designation', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Designation, Active FROM Designation_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Designation
app.post('/designation/create', async (req, res) => {
  const { Designation, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Designation_master (Designation, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Designation, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Designation,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Type', details: err.message });
  }
});

//Update Designation
app.put('/designation/:id', async (req, res) => {
  const { id } = req.params;
  const { Designation, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Designation_master SET Designation = ?, Modified_By = ? WHERE Id = ?`,
      [Designation, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Designation_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Designation', details: err.message });
  }
});

// TOGGLE Active State for Designation
app.post('/designation/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Designation_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Designation_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

//Get All for Tag
app.get('/tag', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Tag, Active FROM Tag_Master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Tag
app.post('/tag/create', async (req, res) => {
  const { Tag, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Tag_master (Tag, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Tag, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Tag,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Tag', details: err.message });
  }
});

//Update Tag
app.put('/tag/:id', async (req, res) => {
  const { id } = req.params;
  const { Tag, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE Tag_master SET Tag = ?, Modified_By = ? WHERE Id = ?`,
      [Tag, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM Tag_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Tag', details: err.message });
  }
});

// TOGGLE Active State for Tag
app.post('/tag/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE Tag_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM Tag_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

//Get All for Unit
app.get('/unit', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT Id, Unit, Active FROM unit_master WHERE Active = 1'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Create Unit
app.post('/unit/create', async (req, res) => {
  const { Unit, Created_By, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO unit_master (Unit, Created_By, Active)
       VALUES (?, ?, ?)`,
      [Unit, Created_By, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId, // Capital I
      Unit,
      Created_By,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating Tag', details: err.message });
  }
});

//Update Unit
app.put('/unit/:id', async (req, res) => {
  const { id } = req.params;
  const { Unit, Modified_By } = req.body;

  try {
    await pool.execute(
      `UPDATE unit_master SET Unit = ?, Modified_By = ? WHERE Id = ?`,
      [Unit, Modified_By, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM unit_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated product
  } catch (err) {
    res.status(500).json({ error: 'Error updating Unit', details: err.message });
  }
});

// TOGGLE Active State for Unit
app.post('/unit/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE unit_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM unit_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// Get stock movement (in/out) details for a product (autocomplete/search helper)
app.get('/product-movement-search', async (req, res) => {
  const { query } = req.query;

  // Only search if at least 3 characters are entered
  if (!query || query.length < 3) {
    return res.status(400).json({ message: 'Please enter at least 3 characters.' });
  }

  // Using parameterized queries for safety
  // We'll use ? as prepared statement and fill with `%${query}%`
  const searchTerm = `%${query}%`;

  const sql = `
    SELECT
        p.Id                AS Prod_Id,
        p.Product_name,
        p.Model_no,
        'IN'                AS Txn_Type,
        si.Invoice_No,
        si.Challan          AS Delivery_Challan,
        si.Created_On       AS Txn_Date,
        ppd.Quantity,
        cm.Company          AS Company_Name
    FROM product_master p
    JOIN product_purchase_details ppd
        ON ppd.Prod_Id = p.Id
    JOIN stock_in si
        ON si.Invoice_No = ppd.Invoice_No
    JOIN company_master cm
        ON cm.Id = si.Comp_Id
    WHERE
        p.Active = 1
        AND si.Active = 1
        AND cm.Active = 1
        AND (
             p.Product_name LIKE ?
          OR p.Model_no     LIKE ?
        )
    UNION ALL
    SELECT
        p.Id                AS Prod_Id,
        p.Product_name,
        p.Model_no,
        'OUT'               AS Txn_Type,
        so.Invoice_No,
        so.Delivery_Challan AS Delivery_Challan,
        so.Invoice_Date     AS Txn_Date,
        psd.Quantity,
        cm.Company          AS Company_Name
    FROM product_master p
    JOIN product_sold_details psd
        ON psd.Prod_Id = p.Id
    JOIN stock_out so
        ON (
            so.Invoice_No = psd.Invoice_No
            OR so.Delivery_Challan = psd.Delivery_Challan
        )
    JOIN company_master cm
        ON cm.Id = so.Comp_Id
    WHERE
        p.Active = 1
        AND so.Active = 1
        AND cm.Active = 1
        AND (
             p.Product_name LIKE ?
          OR p.Model_no     LIKE ?
        )
    ORDER BY
        Txn_Date DESC,
        Txn_Type
    LIMIT 100
  `;

  try {
    // Fill parameters for both UNION queries
    // Params: IN: [Product_name, Model_no], OUT: [Product_name, Model_no]
    const params = [searchTerm, searchTerm, searchTerm, searchTerm];
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Product movement search error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/////////////////////////

/**
 * STOCK MOVEMENT API
 * Purpose:
 * - Identify high, medium, low, dead products
 * - Used for dashboard graphs
 */
app.get("/stock-movement", async (req, res) => {
  const { fromDate, toDate } = req.query;

  try {
    let dateCondition = "";
    const params = [];

    if (fromDate && toDate) {
      dateCondition = "AND so.Invoice_Date BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    }

    const query = `
      SELECT 
        pm.Id AS Prod_Id,
        pm.Product_Name,
        mm.Make,
        COALESCE(SUM(psd.Quantity), 0) AS sold_qty
      FROM product_master pm
      LEFT JOIN product_sales_details psd 
        ON psd.Prod_Id = pm.Id
      LEFT JOIN stock_out so 
        ON so.Id = psd.stock_out_id
        ${dateCondition}
      LEFT JOIN make_master mm 
        ON pm.Make_Id = mm.Id
      GROUP BY pm.Id
      ORDER BY sold_qty DESC
    `;

    const [rows] = await pool.execute(query, params);

    // -----------------------------
    // Categorization Logic
    // -----------------------------
    const sorted = [...rows].sort((a, b) => b.sold_qty - a.sold_qty);

    const totalProducts = sorted.length;

    const p25Index = Math.floor(totalProducts * 0.75);
    const p75Index = Math.floor(totalProducts * 0.25);

    const p25 = sorted[p25Index]?.sold_qty || 0;
    const p75 = sorted[p75Index]?.sold_qty || 0;

    const categorized = rows.map(p => {
      let category = "Medium";

      if (p.sold_qty === 0) category = "Dead";
      else if (p.sold_qty < p25) category = "Low";
      else if (p.sold_qty >= p75) category = "High";

      return {
        ...p,
        category
      };
    });

    // -----------------------------
    // KPI Summary
    // -----------------------------
    const summary = {
      totalProducts,
      highMoving: categorized.filter(p => p.category === "High").length,
      mediumMoving: categorized.filter(p => p.category === "Medium").length,
      lowSelling: categorized.filter(p => p.category === "Low").length,
      deadProducts: categorized.filter(p => p.category === "Dead").length
    };

    res.status(200).json({
      success: true,
      summary,
      data: categorized
    });

  } catch (error) {
    console.error("Stock movement API error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movement data"
    });
  }
});

////////////////////////

// Get all vendors
// GET all vendors with their contact details
// Get all vendors and their contact details as FormArray under same vendor Id
app.get('/vendor', async (req, res) => {
  try {
    // Fetch all vendors
    const [vendors] = await pool.execute(`SELECT * FROM vendors`);
    // Fetch all contacts
    const [contacts] = await pool.execute(`SELECT * FROM vendors_contdetails`);

    // Group contacts as FormArray by vendor_id
    const contactsByVendor = {};
    contacts.forEach(cont => {
      if (!contactsByVendor[cont.vendor_id]) {
        contactsByVendor[cont.vendor_id] = [];
      }
      contactsByVendor[cont.vendor_id].push({
        id: cont.id,
        cust_Name: cont.cust_Name,
        cust_Phone: cont.cust_Phone,
        cust_Email: cont.cust_Email
      });
    });

    // Attach contacts FormArray to corresponding vendor
    const result = vendors.map(vendor => ({
      ...vendor,
      vendors_contdetails: contactsByVendor[vendor.Id] || []
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching vendors', details: err.message });
  }
});

// Create a new vendor and its contact details (stored as FormArray under same vendor Id)
app.post('/vendor/create', async (req, res) => {
  const {
    Vendor_No,
    Comp_Id,
    Make_Id,
    State_Id,
    Country_Id,
    Status,
    CIN,
    TIN,
    VAT,
    CST,
    PAN,
    TAN,
    ECC,
    STP,
    SSI,
    PFNO,
    ESINO,
    GSTNO,
    BusinessLine,
    Product_Id,
    Share,
    ExpYear,
    Major_cust,
    Bank_Id,
    PayMode,
    Name_inBank,
    Branch_Addr,
    IFSC,
    BSR,
    MICR,
    Bank_mailId,
    Active,
    vendors_contdetails // FormArray data for contacts under the vendor
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert vendor
    const [result] = await conn.execute(
      `INSERT INTO vendors (
        Vendor_No, Comp_Id, Make_Id, State_Id, Country_Id, Status, CIN, TIN, VAT, CST, PAN, TAN,
        ECC, STP, SSI, PFNO, ESINO, GSTNO, BusinessLine, Product_Id, Share, ExpYear, Major_cust,
        Bank_Id, PayMode, Name_inBank, Branch_Addr, IFSC, BSR, MICR, Bank_mailId, Active
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        Vendor_No,
        Comp_Id,
        Make_Id,
        State_Id,
        Country_Id,
        Status,
        CIN,
        TIN,
        VAT,
        CST,
        PAN,
        TAN,
        ECC,
        STP,
        SSI,
        PFNO,
        ESINO,
        GSTNO,
        BusinessLine,
        Product_Id,
        Share,
        ExpYear,
        Major_cust,
        Bank_Id,
        PayMode,
        Name_inBank,
        Branch_Addr,
        IFSC,
        BSR,
        MICR,
        Bank_mailId,
        Active ? 1 : 0
      ]
    );
    const vendorId = result.insertId;

    // Insert FormArray of associated contact details
    if (Array.isArray(vendors_contdetails)) {
      for (const detail of vendors_contdetails) {
        await conn.execute(
          `INSERT INTO vendors_contdetails (vendor_id, cust_Name, cust_Phone, cust_Email)
           VALUES (?, ?, ?, ?)`,
          [
            vendorId,
            detail.cust_Name || null,
            detail.cust_Phone || null,
            detail.cust_Email || null
          ]
        );
      }
    }

    await conn.commit();

    // Retrieve newly created vendor and return with its contacts as FormArray
    const [vendorRows] = await conn.execute(`SELECT * FROM vendors WHERE Id = ?`, [vendorId]);
    const [contactRows] = await conn.execute(
      `SELECT id, cust_Name, cust_Phone, cust_Email FROM vendors_contdetails WHERE vendor_id = ?`,
      [vendorId]
    );

    res.status(201).json({
      ...vendorRows[0],
      vendors_contdetails: contactRows
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Error creating vendor', details: err.message });
  } finally {
    conn.release();
  }
});

// Update existing vendor and its contact details FormArray
app.put('/vendor/:id', async (req, res) => {
  const { id } = req.params;
  const {
    Vendor_No,
    Comp_Id,
    Make_Id,
    State_Id,
    Country_Id,
    Status,
    CIN,
    TIN,
    VAT,
    CST,
    PAN,
    TAN,
    ECC,
    STP,
    SSI,
    PFNO,
    ESINO,
    GSTNO,
    BusinessLine,
    Product_Id,
    Share,
    ExpYear,
    Major_cust,
    Bank_Id,
    PayMode,
    Name_inBank,
    Branch_Addr,
    IFSC,
    BSR,
    MICR,
    Bank_mailId,
    vendors_contdetails // FormArray data for contacts
    // Active not handled here; can be added if needed
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE vendors SET
        Vendor_No=?, Comp_Id=?, Make_Id=?, State_Id=?, Country_Id=?, Status=?, CIN=?, TIN=?, VAT=?,
        CST=?, PAN=?, TAN=?, ECC=?, STP=?, SSI=?, PFNO=?, ESINO=?, GSTNO=?, BusinessLine=?, Product_Id=?,
        Share=?, ExpYear=?, Major_cust=?, Bank_Id=?, PayMode=?, Name_inBank=?, Branch_Addr=?,
        IFSC=?, BSR=?, MICR=?, Bank_mailId=?
      WHERE Id = ?`,
      [
        Vendor_No,
        Comp_Id,
        Make_Id,
        State_Id,
        Country_Id,
        Status,
        CIN,
        TIN,
        VAT,
        CST,
        PAN,
        TAN,
        ECC,
        STP,
        SSI,
        PFNO,
        ESINO,
        GSTNO,
        BusinessLine,
        Product_Id,
        Share,
        ExpYear,
        Major_cust,
        Bank_Id,
        PayMode,
        Name_inBank,
        Branch_Addr,
        IFSC,
        BSR,
        MICR,
        Bank_mailId,
        id
      ]
    );

    // Update contacts FormArray (simple: delete then insert all)
    if (Array.isArray(vendors_contdetails)) {
      await conn.execute(`DELETE FROM vendors_contdetails WHERE vendor_id = ?`, [id]);
      for (const detail of vendors_contdetails) {
        await conn.execute(
          `INSERT INTO vendors_contdetails (vendor_id, cust_Name, cust_Phone, cust_Email)
           VALUES (?, ?, ?, ?)`,
          [
            id,
            detail.cust_Name || null,
            detail.cust_Phone || null,
            detail.cust_Email || null
          ]
        );
      }
    }

    await conn.commit();

    // Return updated vendor with contacts as FormArray
    const [vendorRows] = await conn.execute('SELECT * FROM vendors WHERE Id = ?', [id]);
    const [contactRows] = await conn.execute(
      `SELECT id, cust_Name, cust_Phone, cust_Email FROM vendors_contdetails WHERE vendor_id = ?`,
      [id]
    );
    res.json({
      ...vendorRows[0],
      vendors_contdetails: contactRows
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Error updating vendor', details: err.message });
  } finally {
    conn.release();
  }
});

// Toggle Active state for vendor and return with FormArray of contacts
app.post('/vendor/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE vendors SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM vendors WHERE Id = ?`, [id]);
    // Also return contacts as FormArray for consistency
    const [contacts] = await pool.execute(
      `SELECT id, cust_Name, cust_Phone, cust_Email FROM vendors_contdetails WHERE vendor_id = ?`, [id]
    );
    res.json({
      ...rows[0],
      vendors_contdetails: contacts
    });
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});


// LIST Bank
app.get('/bank', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM bank_master`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching banks', details: err.message });
  }
});

// Create Bank
app.post('/bank/create', async (req, res) => {
  const { Bank, Address, Branch, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO bank_master (Bank, Address, Branch, Active)
       VALUES (?, ?, ?, ?)`,
      [Bank, Address, Branch, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId,
      Bank,
      Address,
      Branch,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating bank', details: err.message });
  }
});

// Update Bank
app.put('/bank/:id', async (req, res) => {
  const { id } = req.params;
  const { Bank, Address, Branch } = req.body;

  try {
    await pool.execute(
      `UPDATE bank_master SET Bank = ?, Address = ?, Branch = ? WHERE Id = ?`,
      [Bank, Address, Branch, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM bank_master WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated bank entry
  } catch (err) {
    res.status(500).json({ error: 'Error updating bank', details: err.message });
  }
});

// TOGGLE Active State for Bank
app.post('/bank/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE bank_master SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM bank_master WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});

// LIST States
app.get('/states', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM states`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching states', details: err.message });
  }
});

// Create State
app.post('/states/create', async (req, res) => {
  const { State, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO states (State, Active) VALUES (?, ?)`,
      [State, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId,
      State,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating state', details: err.message });
  }
});

// Update State
app.put('/states/:id', async (req, res) => {
  const { id } = req.params;
  const { State } = req.body;

  try {
    await pool.execute(
      `UPDATE states SET State = ? WHERE Id = ?`,
      [State, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM states WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated state entry
  } catch (err) {
    res.status(500).json({ error: 'Error updating state', details: err.message });
  }
});

// TOGGLE Active State for State
app.post('/states/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE states SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM states WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active state', details: err.message });
  }
});


// LIST Countries
app.get('/countries', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM countries`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching countries', details: err.message });
  }
});

// Create Country
app.post('/countries/create', async (req, res) => {
  const { Country, Active } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO countries (Country, Active) VALUES (?, ?)`,
      [Country, Active ? 1 : 0]
    );
    res.status(201).json({
      Id: result.insertId,
      Country,
      Active
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating country', details: err.message });
  }
});

// Update Country
app.put('/countries/:id', async (req, res) => {
  const { id } = req.params;
  const { Country } = req.body;

  try {
    await pool.execute(
      `UPDATE countries SET Country = ? WHERE Id = ?`,
      [Country, id]
    );

    const [rows] = await pool.execute(`SELECT * FROM countries WHERE Id = ?`, [id]);
    res.json(rows[0]); // Return updated country entry
  } catch (err) {
    res.status(500).json({ error: 'Error updating country', details: err.message });
  }
});

// TOGGLE Active State for Country
app.post('/countries/toggle', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.execute(`UPDATE countries SET Active = NOT Active WHERE Id = ?`, [id]);
    const [rows] = await pool.execute(`SELECT * FROM countries WHERE Id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error toggling active country state', details: err.message });
  }
});

///////////////////////

// START Server
app.listen(5000, '0.0.0.0', () => {
  // console.log("Server is running on LAN...");
});
