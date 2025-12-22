const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

const alterQuery = "ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER username";

db.query(alterQuery, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column email already exists.');
        } else {
            console.error('Error altering table:', err);
        }
    } else {
        console.log('Successfully added email column to users table.');
    }
    process.exit();
});
