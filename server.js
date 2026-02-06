require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ---------- API Routes ----------

// GET /api/trending?region=US&category=0&maxResults=20&keyword=AI
app.get("/api/trending", async (req, res) => {
  const {
    region = "US",
    category = "0",
    maxResults = "20",
    keyword = "",
  } = req.query;

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({
      error: "YouTube API key is not configured. Set YOUTUBE_API_KEY in .env",
    });
  }

  try {
    let videos = [];

    // If keyword provided, use search API
    if (keyword && keyword.trim()) {
      const searchParams = new URLSearchParams({
        part: "snippet",
        q: keyword.trim(),
        type: "video",
        maxResults,
        regionCode: region,
        order: "viewCount", // Sort by popularity
        key: API_KEY,
      });

      if (category !== "0") {
        searchParams.set("videoCategoryId", category);
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        return res.status(searchResponse.status).json({
          error: searchData.error?.message || "YouTube API request failed",
        });
      }

      // Get video IDs from search results
      const videoIds = (searchData.items || [])
        .map((item) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length === 0) {
        return res.json({ videos: [], totalResults: 0 });
      }

      // Fetch full video details with statistics
      const videoParams = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: videoIds.join(","),
        key: API_KEY,
      });

      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?${videoParams}`;
      const videoResponse = await fetch(videoUrl);
      const videoData = await videoResponse.json();

      if (!videoResponse.ok) {
        return res.status(videoResponse.status).json({
          error: videoData.error?.message || "Failed to fetch video details",
        });
      }

      videos = (videoData.items || []).map((item) => ({
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

      res.json({ videos, totalResults: searchData.pageInfo?.totalResults || 0 });
    } else {
      // Default: use mostPopular chart
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

      const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.error?.message || "YouTube API request failed",
        });
      }

      // Shape the response to only what the frontend needs
      videos = (data.items || []).map((item) => ({
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
    }
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
