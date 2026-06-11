// Global configuration for the backend API URL
const API_BASE_URL = "http://localhost:10888/api/v1";

// Execute when the webpage finishes loading
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 CinemaVault Frontend Initialized!");
    fetchMovies();
});

// Function to fetch movies from our Koa + SQLite backend
async function fetchMovies() {
    const movieGrid = document.getElementById("movieGrid");
    
    try {
        // 1. Call our real backend API endpoint
        const response = await fetch(`${API_BASE_URL}/movies`);
        
        // 2. Convert the incoming raw stream into usable JSON array
        const movies = await response.json();
        
        // 3. Clear the "Loading..." placeholder text
        movieGrid.innerHTML = "";
        
        // If no movies returned from database
        if (movies.length === 0) {
            movieGrid.innerHTML = `<div class="loading">🍿 No movies found in the cinema database.</div>`;
            return;
        }

        // 4. Loop through each movie item and build HTML cards dynamically
        movies.forEach(movie => {
            // Create a wrapper div container for the card
            const card = document.createElement("div");
            card.className = "movie-card";
            
            // Construct inner structural HTML for the movie card
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
            
            // Append this freshly built card into our main movie grid wrapper
            movieGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading movies from backend API:", error);
        movieGrid.innerHTML = `<div class="loading">❌ Failed to connect to CinemaVault Backend Server.</div>`;
    }
}