require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ---------- API Routes ----------

// GET /api/trending?region=US&category=0&maxResults=20
app.get("/api/trending", async (req, res) => {
  const {
    region = "US",
    category = "0",
    maxResults = "20",
  } = req.query;

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({
      error: "YouTube API key is not configured. Set YOUTUBE_API_KEY in .env",
    });
  }

  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    regionCode: region,
    videoCategoryId: category,
    maxResults,
    key: API_KEY,
  });

  // Remove category filter when "0" (All)
  if (category === "0") params.delete("videoCategoryId");

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "YouTube API request failed",
      });
    }

    // Shape the response to only what the frontend needs
    const videos = (data.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.high?.url ||
                 item.snippet.thumbnails.medium?.url ||
                 item.snippet.thumbnails.default?.url,
      views: Number(item.statistics.viewCount || 0),
      likes: Number(item.statistics.likeCount || 0),
      comments: Number(item.statistics.commentCount || 0),
      duration: item.contentDetails.duration,
      tags: item.snippet.tags || [],
      categoryId: item.snippet.categoryId,
    }));

    res.json({ videos, totalResults: data.pageInfo?.totalResults || 0 });
  } catch (err) {
    console.error("Error fetching trending videos:", err);
    res.status(500).json({ error: "Failed to fetch trending videos" });
  }
});

// GET /api/categories?region=US
app.get("/api/categories", async (req, res) => {
  const { region = "US" } = req.query;

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({ error: "API key not configured" });
  }

  const params = new URLSearchParams({
    part: "snippet",
    regionCode: region,
    key: API_KEY,
  });

  try {
    const url = `https://www.googleapis.com/youtube/v3/videoCategories?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Failed to fetch categories",
      });
    }

    const categories = (data.items || [])
      .filter((c) => c.snippet.assignable)
      .map((c) => ({ id: c.id, title: c.snippet.title }));

    res.json({ categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀  YT Trends running at http://localhost:${PORT}`);
});
