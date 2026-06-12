// 全域後端 API 基礎網址
const API_BASE_URL = "http://localhost:10888/api/v1";

// 驗證狀態追蹤器 ('login' 或 'register')
let authMode = 'login';

// 🌟 核心安全性設定：請在這裡填入與後端完全一致的真實 Google Client ID
const GOOGLE_CLIENT_ID = "479961485296-bc9qtqof14lj1jv3soqs07qqbqi46hoi.apps.googleusercontent.com";

// 當網頁完全載入時啟動
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 CinemaVault Frontend Initialized!");
    
    // 檢查瀏覽器內是否存有上一次登入的 Token
    checkLoginStatus();
    
    // 執行核心功能
    fetchMovies();
    setupAuthEventListeners();
});

// ==========================================
// 1. 從 Koa + SQLite 後端動態抓取電影
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
// 2. 設定 UI 互動事件 (彈出視窗與表單)
// ==========================================
function setupAuthEventListeners() {
    const loginBtn = document.getElementById("loginBtn");
    const authModal = document.getElementById("authModal");
    const closeModal = document.getElementById("closeModal");
    const toggleAuthLink = document.getElementById("toggleAuthLink");
    const authForm = document.getElementById("authForm");

    // 點擊登入按鈕（如果已登入則執行登出）
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

    // 點擊 (X) 關閉視窗
    closeModal.addEventListener("click", () => {
        authModal.style.display = "none";
    });

    // 在彈出視窗內切換「登入」與「註冊」狀態
    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        authMode = (authMode === 'login') ? 'register' : 'login';
        updateAuthModalUI();
    });

    // 處理原生帳密表單提交
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById("username").value.trim();
        const passwordInput = document.getElementById("password").value;

        const requestBody = {
            username: usernameInput,
            password: passwordInput
        };

        try {
            if (authMode === 'register') {
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
                const res = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || "Login failed");

                // 將 JWT 儲存至瀏覽器
                localStorage.setItem("token", data.token);
                localStorage.setItem("username", data.user.username);
                localStorage.setItem("role", data.user.role);

                alert(`👋 Welcome back, ${data.user.username}!`);
                authModal.style.display = "none";
                checkLoginStatus(); 
            }
        } catch (err) {
            alert(`❌ Error: ${err.message}`);
        }
    });
}

// 動態更新彈出視窗的文字外觀
function updateAuthModalUI() {
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");
    const toggleMessage = document.getElementById("toggleMessage");
    const toggleAuthLink = document.getElementById("toggleAuthLink");
    const authForm = document.getElementById("authForm");

    authForm.reset(); 

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

// 檢查並同步瀏覽器的登入狀態到導覽列上
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    const userInfo = document.getElementById("userInfo");
    const loginBtn = document.getElementById("loginBtn");

    if (token && username) {
        userInfo.innerText = `👤 Hello, ${username} (${role.toUpperCase()})`;
        loginBtn.innerText = "Logout";
        loginBtn.style.backgroundColor = "#333";
    } else {
        userInfo.innerText = "";
        loginBtn.innerText = "Login";
        loginBtn.style.backgroundColor = "#e50914";
    }
}

// 處理登出：清除 Token 並重置介面
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    alert("🔒 Logged out successfully!");
    checkLoginStatus();
}

// ========================================================
// 3. 🌟 實用功能 (Useful): 初始化 Google 官方元件與回呼控制
// ========================================================
window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse // 當使用者選好 Google 帳號後觸發的回呼函式
        });
        
        // 渲染官方設計的標準 Google 登入按鈕
        google.accounts.id.renderButton(
            document.getElementById("googleSignInButton"),
            { theme: "outline", size: "large", width: "320" }
        );
    }
};

// 使用者成功選取 Google 帳號後的處理邏輯
async function handleGoogleCredentialResponse(response) {
    console.log("Google ID Token received:", response.credential);
    
    try {
        // 將 Google 發給我們的憑證，透過 POST 丟回我們的 Koa 後端進行官方驗證
        const res = await fetch(`${API_BASE_URL}/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Google authentication failed");
        
        // 登入成功！保存我們後端簽發的專屬 JWT 安全通行證
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("role", data.user.role); // 後端強制回傳為 'user'
        
        alert(`🎉 Google Login Successful! Welcome, ${data.user.username}`);
        
        // 關閉 Modal 並更新導覽列狀態
        document.getElementById("authModal").style.display = "none";
        checkLoginStatus();
        
    } catch (err) {
        alert(`❌ Google Auth Error: ${err.message}`);
    }
}