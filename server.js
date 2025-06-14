const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "hotel_booking_system", // Specify the database directly here
    multipleStatements: true, // Allow multiple SQL statements in a single query
});

// Initialize database and tables
const initializeDatabase = () => {
    // Queries to create database and tables if they don't exist
    const createDatabaseAndTablesQuery = `
        CREATE DATABASE IF NOT EXISTS hotel_booking_system;
        USE hotel_booking_system;
        
        CREATE TABLE IF NOT EXISTS rooms (
            id INT PRIMARY KEY AUTO_INCREMENT,
            room_number VARCHAR(10) UNIQUE NOT NULL,
            room_type ENUM('single', 'double', 'suite', 'deluxe') NOT NULL,
            price_per_night DECIMAL(10,2) NOT NULL,
            capacity INT NOT NULL,
            amenities TEXT,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            customer_id INT,
            room_id INT,
            check_in_date DATE NOT NULL,
            check_out_date DATE NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            booking_status ENUM('confirmed', 'pending', 'cancelled') DEFAULT 'confirmed',
            special_requests TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        );

        CREATE TABLE IF NOT EXISTS services (
            id INT PRIMARY KEY AUTO_INCREMENT,
            booking_id INT,
            service_name VARCHAR(100) NOT NULL,
            service_cost DECIMAL(10,2) NOT NULL,
            service_date DATE DEFAULT (CURRENT_DATE),
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );
    `;

    db.query(createDatabaseAndTablesQuery, (err) => {
        if (err) {
            console.error("Database and table initialization failed:", err);
            return;
        }
        console.log("Database and tables created/updated successfully.");
        console.log("Ensure 'EditBooking' and 'DeleteBooking' stored procedures are created manually in your MySQL database.");
    });
};

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL database");
    initializeDatabase();
});

// Routes

// New: Login Endpoint
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    // --- SIMPLE HARDCODED CREDENTIALS (FOR DEMO ONLY) ---
    // In a real application, you would query your database,
    // hash the password, and compare it with the stored hash.
    const validUsername = "admin";
    const validPassword = "password"; // Replace with a strong hashed password in production!

    if (username === validUsername && password === validPassword) {
        // In a real app, you'd generate a JWT or set a session
        res.json({ success: true, message: "Login successful!" });
    } else {
        res.status(401).json({ success: false, message: "Invalid username or password." });
    }
});

// API Health Check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Hotel Booking API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    });
});

// Database Health Check
app.get("/api/database/status", (req, res) => {
    const query = "SELECT 1 as test";
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({
                status: "ERROR",
                message: "Database connection failed",
                error: err.message,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            status: "OK",
            message: "Database connection successful",
            timestamp: new Date().toISOString(),
            connection: {
                host: db.config.host,
                database: db.config.database,
                user: db.config.user,
            },
        });
    });
});

// Database Tables Check
app.get("/api/database/tables", (req, res) => {
    const query = `
        SELECT TABLE_NAME, TABLE_ROWS 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'hotel_booking_system'
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({
                status: "ERROR",
                message: "Failed to fetch table information",
                error: err.message,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        res.json({
            status: "OK",
            message: "Database tables information",
            timestamp: new Date().toISOString(),
            tables: results,
        });
    });
});

// System Statistics
app.get("/api/stats", (req, res) => {
    const queries = {
        totalRooms: "SELECT COUNT(*) as count FROM rooms",
        availableRooms:
            "SELECT COUNT(*) as count FROM rooms WHERE is_available = TRUE",
        totalCustomers: "SELECT COUNT(*) as count FROM customers",
        totalBookings: "SELECT COUNT(*) as count FROM bookings",
        pendingBookings:
            'SELECT COUNT(*) as count FROM bookings WHERE booking_status = "pending"',
        confirmedBookings:
            'SELECT COUNT(*) as count FROM bookings WHERE booking_status = "confirmed"',
    };

    const stats = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.query(query, (err, results) => {
            if (err) {
                stats[key] = { error: err.message };
            } else {
                stats[key] = results[0].count;
            }

            completedQueries++;

            if (completedQueries === totalQueries) {
                res.json({
                    status: "OK",
                    message: "System statistics",
                    timestamp: new Date().toISOString(),
                    statistics: stats,
                });
            }
        });
    });
});

// Get all available rooms
app.get("/api/rooms", (req, res) => {
    const query = "SELECT * FROM rooms WHERE is_available = TRUE";
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get all rooms (available or not) - New endpoint for editing
app.get("/api/rooms/all", (req, res) => {
    const query = "SELECT * FROM rooms";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching all rooms:", err); // Log the server-side error
            return res.status(500).json({ error: "Failed to fetch all rooms: " + err.message });
        }
        res.json(results);
    });
});


// Create new room
app.post("/api/rooms", (req, res) => {
    const { room_number, room_type, price_per_night, capacity, amenities } =
        req.body;

    // Validate required fields
    if (
        !room_number ||
        !room_type ||
        !price_per_night ||
        !capacity ||
        !amenities
    ) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Check if room number already exists
    const checkQuery = "SELECT id FROM rooms WHERE room_number = ?";
    db.query(checkQuery, [room_number], (err, existing) => {
        if (err) {
            console.error("Database check error:", err);
            return res.status(500).json({ error: "Database error: " + err.message });
        }

        if (existing.length > 0) {
            return res.status(400).json({ error: "Room number already exists" });
        }

        const insertQuery =
            "INSERT INTO rooms (room_number, room_type, price_per_night, capacity, amenities) VALUES (?, ?, ?, ?, ?)";

        db.query(
            insertQuery,
            [room_number, room_type, price_per_night, capacity, amenities],
            (err, result) => {
                if (err) {
                    console.error("Database insert error:", err);
                    return res
                        .status(500)
                        .json({ error: "Database error: " + err.message });
                }

                res.status(201).json({
                    id: result.insertId,
                    room_number,
                    room_type,
                    price_per_night,
                    capacity,
                    amenities,
                    message: "Room created successfully",
                });
            }
        );
    });
});

// Create new customer
app.post("/api/customers", (req, res) => {
    const { first_name, last_name, email, phone, address } = req.body;
    const query =
        "INSERT INTO customers (first_name, last_name, email, phone, address) VALUES (?, ?, ?, ?, ?)";

    db.query(
        query,
        [first_name, last_name, email, phone, address],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: result.insertId,
                message: "Customer created successfully",
            });
        }
    );
});

// Create new booking
app.post("/api/bookings", (req, res) => {
    const {
        customer_id,
        room_id,
        check_in_date,
        check_out_date,
        special_requests,
    } = req.body;

    const roomQuery = "SELECT price_per_night FROM rooms WHERE id = ?";
    db.query(roomQuery, [room_id], (err, roomResult) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (roomResult.length === 0) {
            return res.status(404).json({ error: "Room not found." });
        }

        const pricePerNight = roomResult[0].price_per_night;
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);

        // Ensure checkOut is after checkIn
        if (checkOut <= checkIn) {
            return res.status(400).json({ error: "Check-out date must be after check-in date." });
        }

        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalAmount = pricePerNight * nights;

        const bookingQuery =
            "INSERT INTO bookings (customer_id, room_id, check_in_date, check_out_date, total_amount, special_requests) VALUES (?, ?, ?, ?, ?, ?)";

        db.query(
            bookingQuery,
            [
                customer_id,
                room_id,
                check_in_date,
                check_out_date,
                totalAmount,
                special_requests,
            ],
            (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const updateRoomQuery =
                    "UPDATE rooms SET is_available = FALSE WHERE id = ?";
                db.query(updateRoomQuery, [room_id], (err) => {
                    if (err) console.error("Error updating room availability:", err);
                });

                res.status(201).json({
                    id: result.insertId,
                    total_amount: totalAmount,
                    message: "Booking created successfully",
                });
            }
        );
    });
});

// Get all bookings (with customer and room details)
app.get("/api/bookings", (req, res) => {
    const query = `
        SELECT b.*, c.first_name, c.last_name, c.email, r.room_number, r.room_type 
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN rooms r ON b.room_id = r.id
        ORDER BY b.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching bookings:", err); // Log the error
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Endpoint to Edit a Booking (calls stored procedure)
app.put("/api/bookings/:id", (req, res) => {
    const bookingId = req.params.id;
    const {
        customer_id,
        room_id,
        check_in_date,
        check_out_date,
        booking_status,
        special_requests,
    } = req.body;

    // Validate required fields
    if (
        !customer_id ||
        !room_id ||
        !check_in_date ||
        !check_out_date ||
        !booking_status
    ) {
        return res.status(400).json({ error: "All required fields (customer_id, room_id, check_in_date, check_out_date, booking_status) are necessary for editing." });
    }

    // Call the stored procedure
    // Note: The stored procedure expects parameters in a specific order.
    const query = `CALL EditBooking(?, ?, ?, ?, ?, ?, ?)`;
    db.query(
        query,
        [
            bookingId,
            customer_id,
            room_id,
            check_in_date,
            check_out_date,
            booking_status,
            special_requests,
        ],
        (err, result) => {
            if (err) {
                console.error("Error calling EditBooking stored procedure:", err);
                return res.status(500).json({ error: "Failed to update booking: " + err.message });
            }
            // Stored procedures might return an empty array or a single row result,
            // so we don't necessarily expect 'insertId' or specific 'results[0]'.
            res.json({ message: "Booking updated successfully", bookingId: bookingId });
        }
    );
});

// Endpoint to Delete a Booking (calls stored procedure)
app.delete("/api/bookings/:id", (req, res) => {
    const bookingId = req.params.id;

    // Call the stored procedure
    const query = `CALL DeleteBooking(?)`;
    db.query(query, [bookingId], (err, result) => {
        if (err) {
            console.error("Error calling DeleteBooking stored procedure:", err);
            return res.status(500).json({ error: "Failed to delete booking: " + err.message });
        }
        res.json({ message: "Booking deleted successfully", bookingId: bookingId });
    });
});

// Add service to booking
app.post("/api/services", (req, res) => {
    const { booking_id, service_name, service_cost } = req.body;
    const query =
        "INSERT INTO services (booking_id, service_name, service_cost) VALUES (?, ?, ?)";

    db.query(query, [booking_id, service_name, service_cost], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: result.insertId, message: "Service added successfully" });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
