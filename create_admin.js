const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_sistem_penilaian_kinerja'
});

const adminUser = {
    username: 'Admin System',
    email: 'admin@gmail.com',
    password: 'admin123',
    role_id: 1
};

// Ensure roles exist
db.query("INSERT IGNORE INTO roles (role_id, role_name) VALUES (1, 'Admin'), (2, 'Karyawan')", (err) => {
    if (err) console.error("Error ensuring roles:", err);

    // Proceed to check/create user
    checkUser();
});

function checkUser() {
    db.query('SELECT * FROM users WHERE email = ?', [adminUser.email], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            process.exit(1);
            return;
        }

        if (results.length > 0) {
            console.log('Admin user already exists.');
            process.exit();
        } else {
            const query = 'INSERT INTO users (username, email, password, role_id, status) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [adminUser.username, adminUser.email, adminUser.password, adminUser.role_id, 'Active'], (err, res) => {
                if (err) {
                    console.error('Error creating admin:', err);
                } else {
                    console.log('Admin user created successfully.');
                }
                process.exit();
            });
        }
    });
}
