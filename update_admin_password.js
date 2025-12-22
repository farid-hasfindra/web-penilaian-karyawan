const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

async function updateAdminPassword() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Update Admin
    db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@gmail.com'], (err, res) => {
        if (err) console.error(err);
        else console.log('Admin password updated to hash.');
        process.exit();
    });
}

updateAdminPassword();
