const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('static')); // Serve static files for simple deployment

// Database Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Default Laragon/XAMPP password
    database: 'db_sistem_penilaian_kinerja',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL Database: db_sistem_penilaian_kinerja');
        connection.release();
    }
});

// --- API ROUTES ---

// 1. Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // Check in Users table (Joined with Roles)
    const query = "SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_id = roles.role_id WHERE users.email = ?";

    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = results[0];

        // Password Comparison with bcrypt
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            // Fallback for legacy plain text passwords (temporary during migration)
            if (user.password === password) {
                // If matches plain text, we should ideally upgrade it here, but let's just allow it for now
                // or stricly enforce hash
            } else {
                return res.status(401).json({ error: 'Incorrect password' });
            }
        }

        // Ideally we don't return plain text match, but for smooth transition let's just enforce match
        // Actually, if await bcrypt.compare is false, it might be plain text.
        // Let's do a robust check:
        let isValid = match;
        if (!isValid && user.password === password) {
            isValid = true; // Allow legacy plain text for now
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // CHECK STATUS: If Non-Active, block login (Only if password is correct)
        if (user.status === 'Non-Active' || user.status === 'Inactive') {
            return res.status(401).json({ error: 'Akun anda sedang dikunci' });
        }

        // Return user info sans password
        res.json({
            id: user.user_id,
            name: user.username,
            email: user.email,
            role: user.role_name
        });
    });
});

// 2. Register Endpoint
app.post('/api/register', async (req, res) => {
    const { name, email, password, tanggal_lahir, alamat, tanggal_bergabung } = req.body;

    // Default role = 2 (Karyawan)
    const roleId = 2;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into users
        const query = 'INSERT INTO users (username, email, password, role_id, status, tanggal_lahir, alamat, tanggal_bergabung) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        db.query(query, [name, email, hashedPassword, roleId, 'Active', tanggal_lahir, alamat, tanggal_bergabung], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    if (err.message.includes('email')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(400).json({ error: 'Duplicate data entry' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Registration successful', userId: result.insertId });
        });
    } catch (e) {
        res.status(500).json({ error: 'Error hashing password' });
    }
});

// 3. Dashboard Stats Endpoint
app.get('/api/dashboard/stats', (req, res) => {
    // Run multiple queries in parallel for stats
    const qEmployees = 'SELECT COUNT(*) as count FROM users WHERE role_id = 2'; // Karyawan only
    const qCriteria = 'SELECT COUNT(*) as count FROM kriteria';
    const qActivePeriod = 'SELECT * FROM periode WHERE status = "Active" LIMIT 1';

    db.query(qEmployees, (err, empRes) => {
        if (err) return res.status(500).json({ error: err });
        const totalEmployees = empRes[0].count;

        db.query(qCriteria, (err, critRes) => {
            if (err) return res.status(500).json({ error: err });
            const totalCriteria = critRes[0].count;

            db.query(qActivePeriod, (err, periodRes) => {
                if (err) return res.status(500).json({ error: err });
                const activePeriod = periodRes.length > 0 ? periodRes[0] : null;

                // If active period exists, get assessment progress
                if (activePeriod) {
                    const qProgress = `SELECT COUNT(DISTINCT karyawan_id) as count FROM penilaian WHERE periode_id = ?`;
                    db.query(qProgress, [activePeriod.periode_id], (err, progRes) => {
                        const assessedCount = progRes[0].count;

                        res.json({
                            totalEmployees,
                            totalCriteria,
                            activePeriod: activePeriod.nama_periode,
                            totalAssessed: assessedCount,
                            progress: totalEmployees > 0 ? Math.round((assessedCount / totalEmployees) * 100) : 0
                        });
                    });
                } else {
                    res.json({
                        totalEmployees,
                        totalCriteria,
                        activePeriod: '-',
                        totalAssessed: 0,
                        progress: 0
                    });
                }
            });
        });
    });
});

// 4. Get Latest Assessments
app.get('/api/assessments/latest', (req, res) => {
    const query = `
        SELECT u.username as nama_karyawan, p.tanggal_penilaian, p.total_nilai, p.status, a.username as penilai
        FROM penilaian p
        JOIN users u ON p.karyawan_id = u.user_id
        JOIN users a ON p.penilai_id = a.user_id
        ORDER BY p.tanggal_penilaian DESC
        LIMIT 5
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// 5. Get All Employees (Master Data)
app.get('/api/employees', (req, res) => {
    // Get all users with role 'Karyawan'
    const query = `
        SELECT u.user_id, u.username, u.email, u.status, u.tanggal_lahir, u.alamat, u.tanggal_bergabung, r.role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        WHERE r.role_name = 'Karyawan'
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 5b. CREATE Employee
app.post('/api/employees', async (req, res) => {
    const { name, email, password, tanggal_lahir, alamat, tanggal_bergabung } = req.body;
    const roleId = 2; // Karyawan

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, email, password, role_id, status, tanggal_lahir, alamat, tanggal_bergabung) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [name, email, hashedPassword, roleId, 'Active', tanggal_lahir || null, alamat || null, tanggal_bergabung || null], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    if (err.message.includes('email')) return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Employee added successfully', id: result.insertId });
        });
    } catch (e) {
        res.status(500).json({ error: 'Error hashing password' });
    }
});

// 5c. DELETE Employee
app.delete('/api/employees/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'DELETE FROM users WHERE user_id = ?';
    db.query(query, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted successfully' });
    });
});

// 5d. UPDATE Employee
app.put('/api/employees/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, email, password, tanggal_lahir, alamat, tanggal_bergabung } = req.body;

    let query = 'UPDATE users SET username = ?, email = ?, tanggal_lahir = ?, alamat = ?, tanggal_bergabung = ?';
    let params = [name, email, tanggal_lahir || null, alamat || null, tanggal_bergabung || null];

    if (password && password.trim() !== "") {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        } catch (e) {
            return res.status(500).json({ error: 'Error hashing password' });
        }
    }

    query += ' WHERE user_id = ?';
    params.push(userId);

    db.query(query, params, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.message.includes('email')) return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'User updated successfully' });
    });
});

// 5e. UPDATE Employee Status (Lock/Unlock)
app.put('/api/employees/:id/status', (req, res) => {
    const userId = req.params.id;
    const { status } = req.body; // 'Active' or 'Non-Active'

    const query = 'UPDATE users SET status = ? WHERE user_id = ?';
    db.query(query, [status, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `User status updated to ${status}` });
    });
});

// 6. Get All Criteria (Master Data)
app.get('/api/criteria', (req, res) => {
    const query = "SELECT * FROM kriteria";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 6b. CREATE Criteria
app.post('/api/criteria', (req, res) => {
    const { name, weight, description } = req.body;
    const query = 'INSERT INTO kriteria (nama_kriteria, bobot, deskripsi) VALUES (?, ?, ?)';
    db.query(query, [name, weight, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Criteria added successfully', id: result.insertId });
    });
});


// 6c. DELETE Criteria
app.delete('/api/criteria/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM kriteria WHERE kriteria_id = ?';
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Criteria deleted successfully' });
    });
});

// 6d. UPDATE Criteria
app.put('/api/criteria/:id', (req, res) => {
    const id = req.params.id;
    const { name, weight, description } = req.body;
    const query = 'UPDATE kriteria SET nama_kriteria = ?, bobot = ?, deskripsi = ? WHERE kriteria_id = ?';
    db.query(query, [name, weight, description, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Criteria updated successfully' });
    });
});

// 7. Get All Periods (Master Data)
app.get('/api/periods', (req, res) => {
    const query = "SELECT * FROM periode";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 7b. CREATE Period
app.post('/api/periods', (req, res) => {
    const { name, status } = req.body;
    const query = 'INSERT INTO periode (nama_periode, status) VALUES (?, ?)';
    db.query(query, [name, status], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Period added successfully', id: result.insertId });
    });
});

// 8. Get Implementation Report (Rankings)
app.get('/api/reports/rankings', (req, res) => {
    // Get rankings for the Active period
    const qActivePeriod = "SELECT periode_id, nama_periode FROM periode WHERE status = 'Active' LIMIT 1";
    db.query(qActivePeriod, (err, pRes) => {
        if (err) return res.status(500).json({ error: err.message });
        if (pRes.length === 0) return res.json({ period: '-', rankings: [] });

        const period = pRes[0];

        const query = `
            SELECT u.username, u.email, p.total_nilai, p.status, u.role_id -- Assuming job title is not in schema yet, using role or placeholder
            FROM penilaian p
            JOIN users u ON p.karyawan_id = u.user_id
            WHERE p.periode_id = ?
            ORDER BY p.total_nilai DESC
        `;

        db.query(query, [period.periode_id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ period: period.nama_periode, rankings: results });
        });
    });
});


// 9. Get Employee Stats
app.get('/api/employees/:id/stats', (req, res) => {
    const empId = req.params.id;
    const qStats = `
        SELECT 
            COUNT(*) as total_assessments, 
            AVG(total_nilai) as avg_score 
        FROM penilaian 
        WHERE karyawan_id = ?
    `;

    db.query(qStats, [empId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const stats = results[0];
        // Calculate trend (dummy logic for now, or compare with previous period if complex)
        // For simplicity, let's just return the raw stats
        res.json({
            total_assessments: stats.total_assessments || 0,
            avg_score: stats.avg_score ? parseFloat(stats.avg_score).toFixed(1) : 0
        });
    });
});

// 10. Get Employee Assessment History
app.get('/api/employees/:id/assessments', (req, res) => {
    const empId = req.params.id;
    const query = `
        SELECT 
            p.*, 
            per.nama_periode,
            u.username as penilai_name
        FROM penilaian p
        JOIN periode per ON p.periode_id = per.periode_id
        JOIN users u ON p.penilai_id = u.user_id
        WHERE p.karyawan_id = ?
        ORDER BY per.tanggal_selesai DESC
    `;

    db.query(query, [empId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'static')}`);
});
