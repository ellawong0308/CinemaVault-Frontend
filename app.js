// 全域後端 API 基礎網址
const API_BASE_URL = "http://localhost:10888/api/v1";

// 驗證狀態追蹤器 ('login' 或 'register')
let authMode = 'login';

// 🌟 核心安全性設定：請在這裡填入與後端完全一致的真實 Google Client ID
const GOOGLE_CLIENT_ID = "479961485296-bc9qtqof14lj1jv3soqs07qqbqi46hoi.apps.googleusercontent.com";

// 當網頁完全載入時啟動
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 CinemaVault Frontend Initialized!");
    
    // 檢查瀏覽器內是否存有上一次登入的 Token 與頭像狀態
    checkLoginStatus();
    
    // 執行核心功能
    fetchMovies();
    setupAuthEventListeners();
    setupAvatarUploadEvents(); // 🌟 核心新增：初始化頭像上傳點擊事件
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

                // 將 JWT 與使用者資料儲存至瀏覽器
                localStorage.setItem("token", data.token);
                localStorage.setItem("username", data.user.username);
                localStorage.setItem("role", data.user.role);
                // 如果該用戶原本在 SQLite 就有頭像，一併記錄下來
                localStorage.setItem("profile_photo", data.user.profile_photo || "");

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

// 檢查並同步瀏覽器的登入狀態與頭像到導覽列上
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const profilePhoto = localStorage.getItem("profile_photo");

    const userInfo = document.getElementById("userInfo");
    const loginBtn = document.getElementById("loginBtn");
    const avatarContainer = document.getElementById("avatarContainer");
    const userAvatar = document.getElementById("userAvatar");

    if (token && username) {
        userInfo.innerText = `Hello, ${username} (${role.toUpperCase()})`;
        loginBtn.innerText = "Logout";
        loginBtn.style.backgroundColor = "#333";
        
        // 顯示大頭貼圓圈
        avatarContainer.style.display = "flex";
        
        // 如果 localStorage 有儲存過頭像路徑，把圖片 src 指向本地後端的託管 URL
        if (profilePhoto) {
            // 由於後端已經開放了 static 服務，且路徑帶有 /uploads/，我們直接接上後端主網址即可
            userAvatar.src = `http://localhost:10888${profilePhoto}`;
        } else {
            // 沒有頭像時，回復為預設灰色頭像
            userAvatar.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5-4-8-4z'/></svg>";
        }
    } else {
        userInfo.innerText = "";
        loginBtn.innerText = "Login";
        loginBtn.style.backgroundColor = "#e50914";
        avatarContainer.style.display = "none"; // 登出後隱藏大頭貼區
    }
}

// 處理登出：清除 Token 與頭像，並重置介面
function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("profile_photo");
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
        const res = await fetch(`${API_BASE_URL}/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Google authentication failed");
        
        // 登入成功！保存我們後端簽發的專屬 JWT 通行證與頭像資訊
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("role", data.user.role); 
        localStorage.setItem("profile_photo", data.user.profile_photo || "");
        
        alert(`🎉 Google Login Successful! Welcome, ${data.user.username}`);
        
        document.getElementById("authModal").style.display = "none";
        checkLoginStatus();
        
    } catch (err) {
        alert(`❌ Google Auth Error: ${err.message}`);
    }
}

// ========================================================
// 4. 🌟 重要功能 (Important): 處理個人大頭貼檔案上傳與即時刷新
// ========================================================
function setupAvatarUploadEvents() {
    const avatarContainer = document.getElementById("avatarContainer");
    const avatarInput = document.getElementById("avatarInput");
    const userAvatar = document.getElementById("userAvatar");

    // 點擊圓形大頭貼時，自動觸發隱藏的 file input 點擊
    avatarContainer.addEventListener("click", () => {
        avatarInput.click();
    });

    // 加上滑鼠懸停放大特效（選加，讓使用者體驗更好）
    avatarContainer.addEventListener("mouseenter", () => { userAvatar.style.transform = "scale(1.1)"; });
    avatarContainer.addEventListener("mouseleave", () => { userAvatar.style.transform = "scale(1.0)"; });

    // 當使用者在選取視窗選好圖片檔案時觸發
    avatarInput.addEventListener("change", async () => {
        const file = avatarInput.files[0];
        if (!file) return; // 如果沒選任何檔案就直接退出

        // 利用 FormData 打包多媒體檔案
        const formData = new FormData();
        formData.append("avatar", file); // ⚠️ 鍵值名稱 "avatar" 必須跟後端 upload.ts 的 upload.single('avatar') 完全對齊！

        // 從瀏覽器取出當前登入使用者的 JWT Token
        const token = localStorage.getItem("token");

        try {
            // 發送異步請求上傳至 Koa 後端
            const response = await fetch(`${API_BASE_URL}/user/profile-photo`, {
                method: "POST",
                headers: {
                    // 🔒 帶上 JWT Token 守衛密鑰，注意：FormData 上傳千萬「不要」手動加 Content-Type Header，瀏覽器會自動生成帶有 boundary 的型態！
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Failed to upload photo");

            // 上傳成功！更新本地緩存的路徑網址
            localStorage.setItem("profile_photo", data.photoUrl);
            
            // 立即動態刷新導覽列上的大頭貼圖片，實現免重新整理即時刷新
            userAvatar.src = `http://localhost:10888${data.photoUrl}`;
            
            alert("📸 Profile photo updated successfully!");

        } catch (error) {
            console.error("Upload error:", error);
            alert(`❌ Upload Failed: ${error.message}`);
        } finally {
            // 清空 file input 的值，確保使用者連續選取同一張圖片時依然能重複觸發事件
            avatarInput.value = "";
        }
    });
}