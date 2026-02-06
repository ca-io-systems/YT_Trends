# YT Trends – YouTube Trending Dashboard

A clean, modern web app that fetches and displays the **top trending videos** from YouTube using the [YouTube Data API v3](https://developers.google.com/youtube/v3).

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Express](https://img.shields.io/badge/Express-4.x-blue)

## Features

- 🔥 **Trending Videos** – fetches the most popular videos via the `mostPopular` chart
- 🌍 **15 Regions** – switch between US, UK, India, Japan, and more
- 🏷️ **Category Filter** – filter by Music, Gaming, Sports, etc.
- 📊 **Aggregate Stats** – total views, likes, and comments at a glance
- 🎬 **Embedded Player** – click any card to watch inline with full details
- 📱 **Responsive** – works beautifully on desktop, tablet, and mobile
- 🔒 **Secure** – API key stays on the server, never exposed to the client

## Setup

### 1. Get a YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Enable the **YouTube Data API v3**
4. Go to **Credentials → Create Credentials → API Key**
5. Copy the key

### 2. Configure & Run

```bash
# Clone / navigate to the project
cd "YT Trends"

# Install dependencies
npm install

# Add your API key
echo "YOUTUBE_API_KEY=your_key_here" > .env

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

### 3. Development Mode (auto-reload)

```bash
npm run dev
```

## Project Structure

```
YT Trends/
├── server.js          # Express backend – proxies YouTube API
├── public/
│   ├── index.html     # Main HTML page
│   ├── style.css      # Dark-themed responsive styles
│   └── app.js         # Frontend logic & rendering
├── .env               # API key (git-ignored)
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/trending?region=US&category=0&maxResults=20` | Fetches trending videos |
| `GET /api/categories?region=US` | Fetches assignable video categories |

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **API:** YouTube Data API v3
- **Styling:** Custom dark theme with CSS Grid
