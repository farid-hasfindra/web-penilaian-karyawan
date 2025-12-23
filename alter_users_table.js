const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

const alterQuery = `
    ALTER TABLE users 
    ADD COLUMN tanggal_lahir DATE NULL AFTER email,
    ADD COLUMN alamat TEXT NULL AFTER tanggal_lahir;
`;

db.query(alterQuery, (err, result) => {
    if (err) {
        // Ignore duplicate column name error if already exists
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
        } else {
            console.error('Error altering table:', err);
        }
    } else {
        console.log('Table users altered successfully.');
    }
    process.exit();
});
