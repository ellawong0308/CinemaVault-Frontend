// Global configuration for the backend API URL
const API_BASE_URL = "http://localhost:10888/api/v1";

// Auth state tracker ('login' or 'register')
let authMode = 'login';

// Execute when the webpage finishes loading
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 CinemaVault Frontend Initialized!");
    
    // Check if user session credentials persist from a previous login
    checkLoginStatus();
    
    // Core structural functions
    fetchMovies();
    setupAuthEventListeners();
});

// ==========================================
// 1. Fetch movies dynamically from SQLite Backend
// ==========================================
async function fetchMovies() {
    const movieGrid = document.getElementById("movieGrid");
    try {
        const response = await fetch(`${API_BASE_URL}/movies`);
        const movies = await response.json();
        movieGrid.innerHTML = "";
        
        if (movies.length === 0) {
            movieGrid.innerHTML = `<div class="loading">🍿 No movies found in the cinema database.</div>`;
            return;
        }

        movies.forEach(movie => {
            const card = document.createElement("div");
            card.className = "movie-card";
            card.innerHTML = `
                <div class="movie-info">
                    <span class="movie-tag">${movie.genre}</span>
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-details">
                        <p><strong>Director:</strong> ${movie.director}</p>
                        <p><strong>Release Year:</strong> ${movie.year}</p>
                    </div>
                </div>
            `;
            movieGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading movies:", error);
        movieGrid.innerHTML = `<div class="loading">❌ Failed to connect to CinemaVault Backend Server.</div>`;
    }
}

// ==========================================
// 2. Setup Interactive UI Events (Modal & Forms)
// ==========================================
function setupAuthEventListeners() {
    const loginBtn = document.getElementById("loginBtn");
    const authModal = document.getElementById("authModal");
    const closeModal = document.getElementById("closeModal");
    const toggleAuthLink = document.getElementById("toggleAuthLink");
    const authForm = document.getElementById("authForm");

    // Open Modal when clicking Login, or handle Logout if already logged in
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        
        if (localStorage.getItem("token")) {
            handleLogout();
        } else {
            authMode = 'login';
            updateAuthModalUI();
            authModal.style.display = "flex";
        }
    });

    // Close Modal when clicking (X)
    closeModal.addEventListener("click", () => {
        authModal.style.display = "none";
    });

    // Toggle between Login and Registration Mode inside modal
    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        authMode = (authMode === 'login') ? 'register' : 'login';
        updateAuthModalUI();
    });

    // Handle Form Submission (Call Real Backend APIs)
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById("username").value.trim();
        const passwordInput = document.getElementById("password").value;

        // Secure Design: Only pack username & password. No 'role' field sent from frontend.
        const requestBody = {
            username: usernameInput,
            password: passwordInput
        };

        try {
            if (authMode === 'register') {
                // Call register API - Backend automatically defaults role to 'user'
                const res = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Registration failed");

                alert("🎉 Registration Successful! Shifting to login mode...");
                authMode = 'login';
                updateAuthModalUI();
            } else {
                // Call login API
                const res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Login failed");

                // Success! Store secure JWT token and user details inside localStorage browser session
                localStorage.setItem("token", data.token);
                localStorage.setItem("username", data.user.username);
                localStorage.setItem("role", data.user.role);

                alert(`👋 Welcome back, ${data.user.username}!`);
                authModal.style.display = "none";
                checkLoginStatus(); // Instantly sync navbar layout status
            }
        } catch (err) {
            alert(`❌ Error: ${err.message}`);
        }
    });
}

// Update Modal Visuals depending on login/register mode status
function updateAuthModalUI() {
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");
    const toggleMessage = document.getElementById("toggleMessage");
    const toggleAuthLink = document.getElementById("toggleAuthLink");
    const authForm = document.getElementById("authForm");

    authForm.reset(); // Erase typed inputs when toggling layout view

    if (authMode === 'register') {
        modalTitle.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        toggleMessage.innerText = "Already have an account?";
        toggleAuthLink.innerText = "Login here";
    } else {
        modalTitle.innerText = "Account Login";
        submitBtn.innerText = "Sign In";
        toggleMessage.innerText = "Don't have an account?";
        toggleAuthLink.innerText = "Register here";
    }
}

// Check if secure token records persist inside browser environment storage
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    const userInfo = document.getElementById("userInfo");
    const loginBtn = document.getElementById("loginBtn");

    if (token && username) {
        // Logged-in view state layout
        userInfo.innerText = `👤 Hello, ${username} (${role.toUpperCase()})`;
        loginBtn.innerText = "Logout";
        loginBtn.style.backgroundColor = "#333";
    } else {
        // Logged-out default view guest state
        userInfo.innerText = "";
        loginBtn.innerText = "Login";
        loginBtn.style.backgroundColor = "#e50914";
    }
}

// Erase data tokens and sync states back to guest mode view
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    alert("🔒 Logged out successfully!");
    checkLoginStatus();
}