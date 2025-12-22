const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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
    const query = `
        SELECT u.*, r.role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        WHERE u.email = ?
    `;

    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = results[0];

        // Simple password check (In production, use bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ error: 'Incorrect password' });
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
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    // Default role = 2 (Karyawan)
    const roleId = 2;

    // Insert into users
    const query = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';

    db.query(query, [name, email, password, roleId], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Registration successful', userId: result.insertId });
    });
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
        SELECT u.user_id, u.username, u.email, r.role_name 
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
app.post('/api/employees', (req, res) => {
    const { name, email, password } = req.body;
    const roleId = 2; // Karyawan
    const query = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
    db.query(query, [name, email, password, roleId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Employee added successfully', id: result.insertId });
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
    const { name, weight } = req.body;
    const query = 'INSERT INTO kriteria (nama_kriteria, bobot) VALUES (?, ?)';
    db.query(query, [name, weight], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Criteria added successfully', id: result.insertId });
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


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'static')}`);
});
