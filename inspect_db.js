const mysql = require('mysql2');
const fs = require('fs');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

db.query('SHOW COLUMNS FROM users', (err, results) => {
    if (err) {
        fs.writeFileSync('db_columns.txt', 'Error: ' + err.message);
    } else {
        const fields = results.map(r => r.Field);
        fs.writeFileSync('db_columns.txt', JSON.stringify(fields, null, 2));
    }
    process.exit();
});
