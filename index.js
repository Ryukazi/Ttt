import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const VIDEO_DIR = path.join(process.cwd(), "videos");
await fs.ensureDir(VIDEO_DIR);

// Resolve short TikTok URLs
async function resolveTikTok(url) {
  try {
    const res = await axios.get(url, { maxRedirects: 5, validateStatus: () => true });
    return res.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

app.get("/api/download", async (req, res) => {
  try {
    let target = req.query.url;
    if (!target) return res.json({ error: "Missing ?url=" });

    // Expand short URL
    target = await resolveTikTok(target);

    const form = new FormData();
    form.append("url", target);

    const xResp = await axios.post(
      "https://tools.xrespond.com/api/social/all/downloader",
      form,
      {
        headers: {
          ...form.getHeaders(),
          accept: "*/*",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/137 Safari/537.36",
          origin: "https://downsocial.io",
          referer: "https://downsocial.io/"
        }
      }
    );

    // Pick the no_watermark or hd_no_watermark video
    const medias = xResp.data.data.medias || [];
    const videoItem = medias.find(m => m.type === "video" && (m.quality === "no_watermark" || m.quality === "hd_no_watermark"));

    if (!videoItem) return res.json({ success: false, reason: "No video found" });

    let videoUrl = videoItem.url.replace(/^\/\//, "https://");

    // Download video to Render server
    const filename = Date.now() + ".mp4";
    const filepath = path.join(VIDEO_DIR, filename);
    const videoStream = await axios.get(videoUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filepath);
    videoStream.data.pipe(writer);
    await new Promise(resolve => writer.on("finish", resolve));

    // Return YOUR hosted Render link
    const hosted = `${req.protocol}://${req.get("host")}/videos/${filename}`;

    res.json({ success: true, hosted });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Serve videos statically
app.use("/videos", express.static(VIDEO_DIR));

app.listen(PORT, () => console.log("Server running on port " + PORT));
