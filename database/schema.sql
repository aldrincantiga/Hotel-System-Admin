CREATE DATABASE hotel_booking_system;
USE hotel_booking_system;

CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type ENUM('single', 'double', 'suite', 'deluxe') NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    capacity INT NOT NULL,
    amenities TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
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

CREATE TABLE services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT,
    service_name VARCHAR(100) NOT NULL,
    service_cost DECIMAL(10,2) NOT NULL,
    service_date DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Stored Procedure to Edit a Booking
-- This procedure allows updating various details of an existing booking.
-- It also handles updating room availability if the room_id changes
-- and recalculates the total_amount if check-in/out dates or room change.
DELIMITER //

CREATE PROCEDURE EditBooking(
    IN p_booking_id INT,
    IN p_customer_id INT,
    IN p_room_id INT,
    IN p_check_in_date DATE,
    IN p_check_out_date DATE,
    IN p_booking_status ENUM('confirmed', 'pending', 'cancelled'),
    IN p_special_requests TEXT
)
BEGIN
    DECLARE old_room_id INT;
    DECLARE new_price_per_night DECIMAL(10,2);
    DECLARE days_diff INT;
    DECLARE new_total_amount DECIMAL(10,2);

    -- Start a transaction to ensure atomicity for room availability updates
    START TRANSACTION;

    -- Get the current room_id associated with the booking
    SELECT room_id INTO old_room_id
    FROM bookings
    WHERE id = p_booking_id;

    -- If the room_id is changing, update availability of old and new rooms
    IF old_room_id IS NOT NULL AND old_room_id != p_room_id THEN
        -- Set old room to available
        UPDATE rooms
        SET is_available = TRUE
        WHERE id = old_room_id;

        -- Set new room to unavailable (assuming it's becoming occupied by this booking)
        UPDATE rooms
        SET is_available = FALSE
        WHERE id = p_room_id;
    END IF;

    -- Get the price per night for the potentially new room
    SELECT price_per_night INTO new_price_per_night
    FROM rooms
    WHERE id = p_room_id;

    -- Calculate the number of nights
    SET days_diff = DATEDIFF(p_check_out_date, p_check_in_date);
    SET new_total_amount = new_price_per_night * days_diff;

    -- Update the booking details
    UPDATE bookings
    SET
        customer_id = p_customer_id,
        room_id = p_room_id,
        check_in_date = p_check_in_date,
        check_out_date = p_check_out_date,
        total_amount = new_total_amount, -- Recalculate total amount
        booking_status = p_booking_status,
        special_requests = p_special_requests
    WHERE id = p_booking_id;

    COMMIT; -- Commit the transaction
END //

DELIMITER ;

-- Stored Procedure to Delete a Booking
-- This procedure deletes a booking and sets the associated room back to available.
DELIMITER //

CREATE PROCEDURE DeleteBooking(
    IN p_booking_id INT
)
BEGIN
    DECLARE booked_room_id INT;

    -- Start a transaction to ensure atomicity
    START TRANSACTION;

    -- Get the room_id associated with the booking before deleting
    SELECT room_id INTO booked_room_id
    FROM bookings
    WHERE id = p_booking_id;

    -- Delete any services related to this booking first (if not handled by CASCADE)
    DELETE FROM services WHERE booking_id = p_booking_id;

    -- Delete the booking
    DELETE FROM bookings
    WHERE id = p_booking_id;

    -- If a room was associated and found, set it back to available
    IF booked_room_id IS NOT NULL THEN
        UPDATE rooms
        SET is_available = TRUE
        WHERE id = booked_room_id;
    END IF;

    COMMIT; -- Commit the transaction
END //

DELIMITER ;


-- Sample data
INSERT INTO rooms (room_number, room_type, price_per_night, capacity, amenities) VALUES
('101', 'single', 80.00, 1, 'WiFi, TV, AC'),
('102', 'double', 120.00, 2, 'WiFi, TV, AC, Mini Bar'),
('201', 'suite', 200.00, 4, 'WiFi, TV, AC, Mini Bar, Balcony'),
('202', 'deluxe', 300.00, 2, 'WiFi, TV, AC, Mini Bar, Jacuzzi, Balcony');