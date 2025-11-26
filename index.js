import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/tiktok", async (req, res) => {
  const tiktokUrl = req.query.url;
  if (!tiktokUrl) return res.status(400).json({ error: "Missing 'url'" });

  try {
    const response = await axios.post(
      "https://fusiontik.vercel.app/api/tiktok",
      { url: tiktokUrl },
      {
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://fusiontik.vercel.app",
          "Referer": "https://fusiontik.vercel.app/",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch TikTok video", details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
