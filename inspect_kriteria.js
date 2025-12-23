const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

db.query('SHOW COLUMNS FROM kriteria', (err, results) => {
    if (err) {
        console.error('Error describing table:', err);
    } else {
        const fields = results.map(r => r.Field);
        console.log("FIELDS:", JSON.stringify(fields));
    }
    process.exit();
});
