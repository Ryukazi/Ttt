import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/tiktok", async (req, res) => {
  const tiktokUrl = req.query.url;
  if (!tiktokUrl) return res.status(400).json({ error: "Missing 'url' query parameter" });

  try {
    const payload = { url: tiktokUrl };

    const response = await axios.post(
      "https://vdownload.2tech.top/vdownload/parse/parseUrlWithSignature",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Origin": "https://www.nodtool.top/",
          "Referer": "https://www.nodtool.top/",
          "Signature": "29f0dc8ecf01c695fefe7c48db3acd46b",
          "Timestamp": `${Date.now()}`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch TikTok video", details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
