const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

db.query('SELECT * FROM kriteria', (err, results) => {
    if (err) {
        console.error('Error fetching criteria:', err);
    } else {
        console.log("Criteria Data:", JSON.stringify(results, null, 2));
    }
    process.exit();
});
