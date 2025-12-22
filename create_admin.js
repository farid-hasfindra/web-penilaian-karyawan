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

const query = `
    INSERT INTO users (username, email, password, role_id) 
    SELECT ?, ?, ?, ? 
    WHERE NOT EXISTS (
        SELECT email FROM users WHERE email = ?
    )
`;

db.query(query, [adminUser.username, adminUser.email, adminUser.password, adminUser.role_id, adminUser.email], (err, result) => {
    if (err) {
        console.error('Error creating admin:', err);
    } else {
        if (result.affectedRows > 0) {
            console.log('Admin account created successfully.');
        } else {
            console.log('Admin account already exists.');
        }
    }
    process.exit();
});
