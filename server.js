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

// GET /api/stats?region=US&keyword=AI&maxResults=50
// Fetches trending/search videos and extracts top tags, topics, channels
app.get("/api/stats", async (req, res) => {
  const {
    region = "US",
    keyword = "",
    maxResults = "50",
  } = req.query;

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    let videoItems = [];

    if (keyword && keyword.trim()) {
      // Search by keyword
      const searchParams = new URLSearchParams({
        part: "snippet",
        q: keyword.trim(),
        type: "video",
        maxResults: Math.min(Number(maxResults), 50),
        regionCode: region,
        order: "viewCount",
        key: API_KEY,
      });

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json();
      if (!searchResp.ok) {
        return res.status(searchResp.status).json({ error: searchData.error?.message || "API error" });
      }

      const videoIds = (searchData.items || []).map((i) => i.id.videoId).filter(Boolean);
      if (videoIds.length === 0) {
        return res.json({ tags: [], channels: [], categories: [], totals: {}, topVideos: [] });
      }

      const vidParams = new URLSearchParams({
        part: "snippet,statistics,contentDetails,topicDetails",
        id: videoIds.join(","),
        key: API_KEY,
      });
      const vidResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vidParams}`);
      const vidData = await vidResp.json();
      if (!vidResp.ok) {
        return res.status(vidResp.status).json({ error: vidData.error?.message || "API error" });
      }
      videoItems = vidData.items || [];
    } else {
      // Trending videos
      const params = new URLSearchParams({
        part: "snippet,statistics,contentDetails,topicDetails",
        chart: "mostPopular",
        regionCode: region,
        maxResults: Math.min(Number(maxResults), 50),
        key: API_KEY,
      });

      const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
      const data = await resp.json();
      if (!resp.ok) {
        return res.status(resp.status).json({ error: data.error?.message || "API error" });
      }
      videoItems = data.items || [];
    }

    // --- Extract analytics ---
    const tagCount = {};
    const channelMap = {};
    const categoryCount = {};
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    const topVideos = [];

    for (const item of videoItems) {
      const views = Number(item.statistics?.viewCount || 0);
      const likes = Number(item.statistics?.likeCount || 0);
      const comments = Number(item.statistics?.commentCount || 0);
      totalViews += views;
      totalLikes += likes;
      totalComments += comments;

      // Tags
      const tags = item.snippet?.tags || [];
      for (const tag of tags) {
        const lower = tag.toLowerCase();
        tagCount[lower] = (tagCount[lower] || 0) + 1;
      }

      // Channels
      const chId = item.snippet?.channelId;
      const chTitle = item.snippet?.channelTitle;
      if (chId) {
        if (!channelMap[chId]) {
          channelMap[chId] = { name: chTitle, views: 0, videos: 0 };
        }
        channelMap[chId].views += views;
        channelMap[chId].videos += 1;
      }

      // Category
      const catId = item.snippet?.categoryId;
      if (catId) {
        categoryCount[catId] = (categoryCount[catId] || 0) + 1;
      }

      // Top videos by views
      topVideos.push({
        id: item.id,
        title: item.snippet?.title,
        channel: chTitle,
        views,
        likes,
        comments,
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
        publishedAt: item.snippet?.publishedAt,
        duration: item.contentDetails?.duration,
      });
    }

    // Sort & limit
    const sortedTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const sortedChannels = Object.entries(channelMap)
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    const sortedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));

    topVideos.sort((a, b) => b.views - a.views);

    // Fetch category names
    const catParams = new URLSearchParams({
      part: "snippet",
      regionCode: region,
      key: API_KEY,
    });
    let categoryNames = {};
    try {
      const catResp = await fetch(`https://www.googleapis.com/youtube/v3/videoCategories?${catParams}`);
      const catData = await catResp.json();
      if (catData.items) {
        for (const c of catData.items) {
          categoryNames[c.id] = c.snippet.title;
        }
      }
    } catch { /* silently fail */ }

    const categoriesWithNames = sortedCategories.map((c) => ({
      ...c,
      name: categoryNames[c.id] || `Category ${c.id}`,
    }));

    res.json({
      tags: sortedTags,
      channels: sortedChannels,
      categories: categoriesWithNames,
      topVideos: topVideos.slice(0, 10),
      totals: {
        videos: videoItems.length,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
      },
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Serve stats page
app.get("/stats", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀  YT Trends running at http://localhost:${PORT}`);
});
