const API_BASE = "http://localhost:3000/api";

// Global variables
let rooms = []; // Stores available rooms (for 'Make Booking' section)
let allRooms = []; // Stores ALL rooms (for 'Edit Booking' modal)
let bookings = [];
let isLoggedIn = false; // Track login state

// DOM elements
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const closeModal = document.querySelector(".close");
const header = document.querySelector("header");
const nav = document.querySelector("nav");
const body = document.body; // Reference to the body for class manipulation


// Initialize app
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded fired. Checking login state...");
    // Check if user is already "logged in" (simulated via sessionStorage)
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        isLoggedIn = true;
        console.log("Session storage indicates logged in. Showing main app.");
        showMainApp(); // If already logged in, show the main application
    } else {
        isLoggedIn = false; // Ensure explicit false
        console.log("Not logged in. Showing login form.");
        showLogin(); // Otherwise, show the login form
    }

    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    document
        .getElementById("booking-form")
        .addEventListener("submit", handleBookingSubmit);
    document
        .getElementById("add-room-form")
        .addEventListener("submit", handleAddRoomSubmit);
    closeModal.addEventListener("click", () => (modal.style.display = "none"));
    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    // Login form submission listener
    document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);

    // Logout button listener
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
}

// Function to show the login section and hide all other sections
function showLogin() {
    console.log("Entering showLogin()...");
    isLoggedIn = false; // Ensure loggedIn state is false
    sessionStorage.removeItem('isLoggedIn'); // Clear any lingering session

    body.classList.add('login-active'); // Add class to body to hide header/nav

    // Hide all main content sections (any section directly within <main>)
    document.querySelectorAll("main > .section").forEach(section => {
        if (section.id !== "login-section") { // Don't try to remove 'active' from login-section itself, it will be added below
             console.log(`Hiding section: ${section.id}`);
            section.classList.remove("active");
        }
    });

    // Show only the login section
    const loginSection = document.getElementById("login-section");
    if (loginSection) {
        loginSection.classList.add("active");
        console.log("Showing login-section.");
    }
    console.log("Exiting showLogin().");
}

// Function to show the main application content and hide the login section
function showMainApp() {
    console.log("Entering showMainApp()...");
    isLoggedIn = true; // Set loggedIn state to true
    sessionStorage.setItem('isLoggedIn', 'true'); // Persist login state

    body.classList.remove('login-active'); // Remove class from body to show header/nav

    // Hide the login section explicitly
    document.getElementById("login-section").classList.remove("active"); 
    
    // Default to system status section after login
    // This call to showSection will handle showing the target section and hiding others
    showSection('system-status'); 

    // Load initial data for the application
    loadRooms(); // This loads available rooms for the 'rooms' section AND updates the global 'rooms' array
    loadAllRoomsForEdit(); // Load all rooms for edit modal
    loadBookings();
    loadSystemStatus(); 
    console.log("Exiting showMainApp().");
}

// Handle Login Submission
async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const loginMessage = document.getElementById("login-message");

    loginMessage.textContent = "Logging in...";
    loginMessage.className = "login-message"; // Reset classes

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            loginMessage.textContent = "Login successful!";
            loginMessage.classList.add("success");
            // Show main app after a short delay to allow message to be seen
            setTimeout(showMainApp, 1000); 
        } else {
            throw new Error(result.message || "Login failed.");
        }
    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.classList.add("error");
        console.error("Login error:", error);
    }
}

// Handle Logout
function handleLogout() {
    console.log("Logging out...");
    showNotification("Logged out successfully.", "info");
    showLogin(); // Redirect to login screen
}


// Navigation function to show specific content sections
async function showSection(sectionName) { // Made async to await loadRoomsForBooking
    console.log(`Entering showSection(${sectionName})...`);
    // Crucial check: if not logged in, force back to login and prevent navigation
    if (!isLoggedIn) {
        showNotification("Please log in to access the system.", "error");
        showLogin();
        console.log("Not logged in, redirected to showLogin().");
        return;
    }

    // Hide all sections within the main content area (excluding the login section)
    document.querySelectorAll("main > .section").forEach((section) => {
        if (section.id !== "login-section") { // Make sure not to touch login-section if it's there
             console.log(`Hiding section in showSection: ${section.id}`);
            section.classList.remove("active");
        }
    });

    // Remove active class from all nav buttons
    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    // Show the selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add("active");
        console.log(`Showing section: ${sectionName}`);
    } else {
        console.warn(`Section with ID '${sectionName}' not found.`);
    }

    // Add active class to the corresponding nav button
    const navButton = document.querySelector(`.nav-btn[onclick*="${sectionName}"]`);
    if (navButton) {
        navButton.classList.add("active");
    }


    // Load data specific to the section
    if (sectionName === "booking") {
        await loadRoomsForBooking(); // Await this to ensure rooms are loaded before populating dropdown
    } else if (sectionName === "bookings") {
        loadBookings();
    } else if (sectionName === "system-status") {
        loadSystemStatus();
    }
    console.log(`Exiting showSection(${sectionName}).`);
}

// API calls
async function loadRooms() {
    console.log("Fetching available rooms...");
    try {
        const response = await fetch(`${API_BASE}/rooms`);
        rooms = await response.json();
        displayRooms();
        console.log("Available rooms loaded:", rooms);
    } catch (error) {
        console.error("Error loading rooms:", error);
        showNotification("Error loading available rooms", "error");
    }
}

async function loadAllRoomsForEdit() {
    console.log("Fetching all rooms for edit modal...");
    try {
        const response = await fetch(`${API_BASE}/rooms/all`);
        allRooms = await response.json();
        console.log("All rooms loaded for edit:", allRooms);
    } catch (error) {
        console.error("Error loading all rooms for edit:", error);
        showNotification("Error loading all rooms for editing", "error");
    }
}

async function loadBookings() {
    console.log("Fetching bookings...");
    try {
        const response = await fetch(`${API_BASE}/bookings`);
        bookings = await response.json();
        displayBookings();
        console.log("Bookings loaded:", bookings);
    } catch (error) {
        console.error("Error loading bookings:", error);
        showNotification("Error loading bookings", "error");
    }
}

// This function populates the 'Select Room' dropdown in the booking form
async function loadRoomsForBooking() { // Made async to potentially await 'rooms' if needed
    console.log("Populating rooms for booking form...");
    const roomSelect = document.querySelector('#booking-form select[name="room_id"]');
    
    // Clear existing options first (except the default "Select Room")
    roomSelect.innerHTML = '<option value="">Select Room</option>';

    // Ensure 'rooms' array is populated. If not, try fetching them.
    if (rooms.length === 0) {
        await loadRooms(); // Ensure rooms are loaded before populating dropdown
    }

    // Now populate the dropdown
    if (rooms.length > 0) {
        rooms.forEach((room) => {
            const option = document.createElement("option");
            option.value = room.id;
            option.textContent = `Room ${room.room_number} - ${capitalizeFirst(room.room_type)} - $${room.price_per_night}/night`;
            roomSelect.appendChild(option);
        });
        console.log("Rooms populated in booking form dropdown.");
    } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No available rooms found.";
        roomSelect.appendChild(option);
        roomSelect.disabled = true; // Disable if no rooms
        console.log("No available rooms to populate in booking form dropdown.");
    }
}

// Display functions
function displayRooms() {
    const roomsGrid = document.getElementById("rooms-grid");
    roomsGrid.innerHTML = "";

    if (rooms.length === 0) {
        roomsGrid.innerHTML = '<p style="text-align: center; color: #666;">No available rooms found.</p>';
        return;
    }

    rooms.forEach((room) => {
        const roomCard = document.createElement("div");
        roomCard.className = "room-card";
        roomCard.innerHTML = `
            <h3>Room ${room.room_number}</h3>
            <p><strong>Type:</strong> ${capitalizeFirst(room.room_type)}</p>
            <p><strong>Capacity:</strong> ${room.capacity} ${
            room.capacity === 1 ? "person" : "people"
        }</p>
            <p><strong>Amenities:</strong> ${room.amenities}</p>
            <p class="price">$${room.price_per_night}/night</p>
        `;
        roomsGrid.appendChild(roomCard);
    });
}

function displayBookings() {
    const bookingsList = document.getElementById("bookings-list");
    bookingsList.innerHTML = "";

    if (bookings.length === 0) {
        bookingsList.innerHTML =
            '<p style="text-align: center; color: #666;">No bookings found.</p>';
        return;
    }

    bookings.forEach((booking) => {
        const bookingCard = document.createElement("div");
        bookingCard.className = "booking-card";
        bookingCard.innerHTML = `
            <h4>Booking #${booking.id}</h4>
            <div class="booking-details">
                <div class="detail-item">
                    <div class="detail-label">Guest Name</div>
                    <div class="detail-value">${booking.first_name} ${
            booking.last_name
        }</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${booking.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Room</div>
                    <div class="detail-value">Room ${
            booking.room_number
        } (${capitalizeFirst(booking.room_type)})</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Check-in</div>
                    <div class="detail-value">${formatDate(
            booking.check_in_date
        )}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Check-out</div>
                    <div class="detail-value">${formatDate(
            booking.check_out_date
        )}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Amount</div>
                    <div class="detail-value">$${booking.total_amount}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${capitalizeFirst(
            booking.booking_status
        )}</div>
                </div>
            </div>
            ${
            booking.special_requests
                ? `<p><strong>Special Requests:</strong> ${booking.special_requests}</p>`
                : ""
        }
            <div class="booking-actions">
                <button class="btn-secondary edit-booking-btn" data-id="${booking.id}">Edit</button>
                <button class="btn-danger delete-booking-btn" data-id="${booking.id}">Delete</button>
            </div>
        `;
        bookingsList.appendChild(bookingCard);
    });

    // Attach event listeners to the new buttons
    document.querySelectorAll(".edit-booking-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const bookingId = e.target.dataset.id;
            editBooking(bookingId);
        });
    });

    document.querySelectorAll(".delete-booking-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const bookingId = e.target.dataset.id;
            deleteBooking(bookingId);
        });
    });
}

// Form handling
async function handleBookingSubmit(e) {
    e.preventDefault();

    try {
        // Get customer data
        const customerForm = document.getElementById("customer-form");
        const customerData = new FormData(customerForm);
        const customer = Object.fromEntries(customerData.entries());

        // Create customer
        const customerResponse = await fetch(`${API_BASE}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer),
        });

        const customerResult = await customerResponse.json();

        if (!customerResponse.ok) {
            throw new Error(customerResult.error || "Failed to create customer");
        }

        // Get booking data
        const bookingForm = document.getElementById("booking-form");
        const bookingData = new FormData(bookingForm);
        const booking = Object.fromEntries(bookingData.entries());
        booking.customer_id = customerResult.id;

        // Create booking
        const bookingResponse = await fetch(`${API_BASE}/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(booking),
        });

        const bookingResult = await bookingResponse.json();

        if (!bookingResponse.ok) {
            throw new Error(bookingResult.error || "Failed to create booking");
        }

        // Show success message
        showModal(`
            <h3 style="color: #28a745;">Booking Successful!</h3>
            <p><strong>Booking ID:</strong> ${bookingResult.id}</p>
            <p><strong>Total Amount:</strong> $${bookingResult.total_amount}</p>
            <p>Your reservation has been confirmed.</p>
        `);

        // Reset forms
        customerForm.reset();
        bookingForm.reset();

        // Refresh data
        loadRooms();
        loadBookings();
    } catch (error) {
        console.error("Booking error:", error);
        showNotification(error.message, "error");
    }
}

async function handleAddRoomSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(e.target);
        const roomData = Object.fromEntries(formData.entries());

        // Convert numeric fields
        roomData.price_per_night = parseFloat(roomData.price_per_night);
        roomData.capacity = parseInt(roomData.capacity);

        const response = await fetch(`${API_BASE}/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roomData),
        });

        // Check if response is ok before parsing JSON
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Show success message
        showModal(`
            <h3 style="color: #28a745;">Room Added Successfully!</h3>
            <p><strong>Room Number:</strong> ${roomData.room_number}</p>
            <p><strong>Type:</strong> ${capitalizeFirst(roomData.room_type)}</p>
            <p><strong>Price:</strong> $${roomData.price_per_night}/night</p>
            <p>The room is now available for booking.</p>
        `);

        // Reset form
        e.target.reset();

        // Refresh rooms data
        loadRooms(); // Refresh available rooms
        loadAllRoomsForEdit(); // Refresh all rooms for edit modal
    } catch (error) {
        console.error("Add room error:", error);
        showNotification(error.message, "error");
    }
}

// Delete Booking Function
async function deleteBooking(bookingId) {
    const confirmed = await showConfirmationModal("Are you sure you want to delete this booking? This action cannot be undone.");
    if (!confirmed) {
        showNotification("Booking deletion cancelled.", "info");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete booking.');
        }

        const data = await response.json();
        showNotification(data.message, "success");
        loadBookings(); // Refresh the list of bookings
        loadRooms(); // Refresh room availability
    } catch (error) {
        console.error('Error deleting booking:', error);
        showNotification(`Error: ${error.message}`, "error");
    }
}

// Edit Booking Function
async function editBooking(bookingId) {
    const bookingToEdit = bookings.find(b => b.id == bookingId);
    if (!bookingToEdit) {
        showNotification("Booking not found for editing.", "error");
        return;
    }

    // Load all rooms before opening the edit modal
    await loadAllRoomsForEdit();

    showEditBookingModal(bookingToEdit);
}

// Update Booking Function (called from the edit modal form submission)
async function updateBooking(bookingId, updatedData) {
    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update booking.');
        }

        const data = await response.json();
        showNotification(data.message, "success");
        modal.style.display = "none"; // Close the modal
        loadBookings(); // Refresh the list of bookings
        loadRooms(); // Refresh room availability
    } catch (error) {
        console.error('Error updating booking:', error);
        showNotification(`Error: ${error.message}`, "error");
    }
}


// System Status Functions
async function loadSystemStatus() {
    await checkApiStatus();
    await checkDatabaseStatus();
    await loadSystemStats();
    await loadTablesInfo();
}

async function checkApiStatus() {
    const indicator = document.getElementById("api-indicator");
    const details = document.getElementById("api-details");

    try {
        const response = await fetch(`${API_BASE}/health`);
        const result = await response.json();

        if (response.ok) {
            indicator.textContent = "Online";
            indicator.className = "status-indicator status-ok";
            details.textContent = `${result.message} - ${result.timestamp}`;
        } else {
            throw new Error("API not responding properly");
        }
    } catch (error) {
        indicator.textContent = "Offline";
        indicator.className = "status-indicator status-error";
        details.textContent = `Error: ${error.message}`;
    }
}

async function checkDatabaseStatus() {
    const indicator = document.getElementById("db-indicator");
    const details = document.getElementById("db-details");

    try {
        const response = await fetch(`${API_BASE}/database/status`);
        const result = await response.json();

        if (response.ok && result.status === "OK") {
            indicator.textContent = "Connected";
            indicator.className = "status-indicator status-ok";
            details.textContent = `${result.message} - Host: ${result.connection.host}`;
        } else {
            throw new Error(result.message || "Database connection failed");
        }
    } catch (error) {
        indicator.textContent = "Disconnected";
        indicator.className = "status-indicator status-error";
        details.textContent = `Error: ${error.message}`;
    }
}

async function loadSystemStats() {
    const statsGrid = document.getElementById("stats-grid");

    try {
        const response = await fetch(`${API_BASE}/stats`);
        const result = await response.json();
        if (response.ok) {
            const stats = result.statistics;
            statsGrid.innerHTML = `
                <div class="stat-item">
                    <div class="stat-number">${stats.totalRooms}</div> 
                    <div class="stat-label">Total Rooms</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.availableRooms}</div>
                    <div class="stat-label">Available Rooms</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.totalCustomers}</div>
                    <div class="stat-label">Total Customers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.totalBookings}</div>
                    <div class="stat-label">Total Bookings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.pendingBookings}</div>
                    <div class="stat-label">Pending Bookings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${stats.confirmedBookings}</div>
                    <div class="stat-label">Confirmed Bookings</div>
                </div>
            `;
        } else {
            throw new Error("Failed to load statistics");
        }
    } catch (error) {
        statsGrid.innerHTML = `<p style="color: #e74c3c;">Error loading statistics: ${error.message}</p>`;
    }
}

async function loadTablesInfo() {
    const tablesInfo = document.getElementById("tables-info");

    try {
        const response = await fetch(`${API_BASE}/database/tables`);
        const result = await response.json();

        if (response.ok) {
            tablesInfo.innerHTML = result.tables
                .map(
                    (table) => `
                <div class="table-item">
                    <span class="table-name">${table.TABLE_NAME}</span>
                    <span class="table-rows">${table.TABLE_ROWS || 0} rows</span>
                </div>
            `
                )
                .join("");
        } else {
            throw new Error("Failed to load table information");
        }
    } catch (error) {
        tablesInfo.innerHTML = `<p style="color: #e74c3c;">Error loading table information: ${error.message}</p>`;
    }
}

function refreshSystemStatus() {
    loadSystemStatus();
    showNotification("System status refreshed", "info");
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    // Ensure dateString is in 'YYYY-MM-DD' format for input type="date"
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Custom Modal functions
function showModal(content) {
    modalBody.innerHTML = content;
    modal.style.display = "block";
}

// Custom Confirmation Modal
function showConfirmationModal(message) {
    return new Promise((resolve) => {
        const confirmationHtml = `
            <h3 style="color: #f39c12;">Confirmation</h3>
            <p>${message}</p>
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                <button id="confirm-yes-btn" class="btn-primary">Yes</button>
                <button id="confirm-no-btn" class="btn-secondary">No</button>
            </div>
        `;
        showModal(confirmationHtml);

        document.getElementById("confirm-yes-btn").onclick = () => {
            modal.style.display = "none";
            resolve(true);
        };
        document.getElementById("confirm-no-btn").onclick = () => {
            modal.style.display = "none";
            resolve(false);
        };
    });
}

// Custom Edit Booking Modal
function showEditBookingModal(booking) {
    const formattedCheckIn = formatDate(booking.check_in_date);
    const formattedCheckOut = formatDate(booking.check_out_date);

    const roomOptions = allRooms.map(room => {
        const selected = room.id === booking.room_id ? 'selected' : '';
        return `<option value="${room.id}" ${selected}>Room ${room.room_number} (${capitalizeFirst(room.room_type)}) - $${room.price_per_night}/night</option>`;
    }).join('');

    const statusOptions = ['confirmed', 'pending', 'cancelled'].map(status => {
        const selected = status === booking.booking_status ? 'selected' : '';
        return `<option value="${status}" ${selected}>${capitalizeFirst(status)}</option>`;
    }).join('');

    const editFormHtml = `
        <h3 style="color: #3498db;">Edit Booking #${booking.id}</h3>
        <form id="edit-booking-form">
            <h4>Customer Information</h4>
            <input type="text" name="first_name" placeholder="First Name" value="${booking.first_name}" required disabled/>
            <input type="text" name="last_name" placeholder="Last Name" value="${booking.last_name}" required disabled/>
            <input type="email" name="email" placeholder="Email" value="${booking.email}" required disabled/>
            <!-- Disabling customer fields as per original schema customers cannot be updated from bookings -->
            <!-- If customer update is needed, you'd need a separate endpoint for customers or adjust the stored procedure -->

            <h4>Booking Details</h4>
            <select name="room_id" required>
                ${roomOptions}
            </select>
            <input type="date" name="check_in_date" value="${formattedCheckIn}" required />
            <input type="date" name="check_out_date" value="${formattedCheckOut}" required />
            <select name="booking_status" required>
                ${statusOptions}
            </select>
            <textarea name="special_requests" placeholder="Special Requests" rows="3">${booking.special_requests || ''}</textarea>
            
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn-primary">Save Changes</button>
                <button type="button" id="cancel-edit-btn" class="btn-secondary">Cancel</button>
            </div>
        </form>
    `;
    showModal(editFormHtml);

    // Attach event listener for the edit form submission
    document.getElementById("edit-booking-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedData = Object.fromEntries(formData.entries());
        
        // Ensure numeric types are parsed correctly for the backend
        updatedData.customer_id = booking.customer_id; // Keep original customer_id
        updatedData.room_id = parseInt(updatedData.room_id);

        // Basic date validation
        const checkIn = new Date(updatedData.check_in_date);
        const checkOut = new Date(updatedData.check_out_date);
        if (checkOut <= checkIn) {
            showNotification("Check-out date must be after check-in date for editing.", "error");
            return;
        }

        await updateBooking(booking.id, updatedData);
    });

    document.getElementById("cancel-edit-btn").onclick = () => {
        modal.style.display = "none";
    };
}


function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "error" ? "#e74c3c" : type === "success" ? "#28a745" : "#3498db"};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Fade in
    setTimeout(() => {
        notification.style.opacity = 1;
    }, 10);

    // Fade out and remove
    setTimeout(() => {
        notification.style.opacity = 0;
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }, 3000);
}
