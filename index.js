import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// === Video directory ===
const VIDEO_DIR = path.join(process.cwd(), "videos");
await fs.ensureDir(VIDEO_DIR);

// === AUTO EXPAND SHORT TIKTOK LINKS ===
async function resolveTikTok(url) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: () => true
    });
    return res.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

app.get("/", (req, res) => {
  res.send("Rehost API Running ✔");
});

// === MAIN ENDPOINT ===
app.get("/api/download", async (req, res) => {
  try {
    let target = req.query.url;
    if (!target) return res.json({ error: "Missing ?url=" });

    // Resolve TikTok vt / vm short links
    target = await resolveTikTok(target);

    // === Build multipart form ===
    const form = new FormData();
    form.append("url", target);

    // === Send request to xrespond EXACTLY like browser ===
    const xResp = await axios.post(
      "https://tools.xrespond.com/api/social/all/downloader",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          "origin": "https://downsocial.io",
          "referer": "https://downsocial.io/",
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty"
        }
      }
    );

    // === Handle xrespond result ===
    if (!xResp.data || !xResp.data.data) {
      return res.json({ success: false, reason: "No video data", raw: xResp.data });
    }

    // Extract video URL
    let videoUrl =
      xResp.data.data.video?.no_wm ||
      xResp.data.data.video?.url ||
      xResp.data.data.media ||
      null;

    if (!videoUrl)
      return res.json({ success: false, reason: "No direct video URL found", raw: xResp.data });

    // Fix //cdn links
    videoUrl = videoUrl.replace(/^\/\//, "https://");

    // === Download video ===
    const filename = Date.now() + ".mp4";
    const filepath = path.join(VIDEO_DIR, filename);

    const videoStream = await axios.get(videoUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filepath);
    videoStream.data.pipe(writer);

    await new Promise((resolve) => writer.on("finish", resolve));

    // === Return YOUR hosted URL ===
    const hosted = `${req.protocol}://${req.get("host")}/videos/${filename}`;

    res.json({
      success: true,
      hosted,
      original: videoUrl
    });
  } catch (err) {
    res.json({
      error: true,
      message: err.message,
      details: err.response?.data
    });
  }
});

// === Serve videos ===
app.use("/videos", express.static(VIDEO_DIR));

app.listen(PORT, () => console.log("Running on port " + PORT));
