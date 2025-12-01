import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const VIDEO_DIR = path.join(process.cwd(), "videos");
await fs.ensureDir(VIDEO_DIR);

app.get("/", (req, res) => {
  res.send("Video Rehosting API Running ✔");
});

// Main route
app.get("/api/download", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.json({ error: "Missing ?url=" });

    const form = new FormData();
    form.append("url", target);

    // xrespond
    const xResp = await axios.post(
      "https://tools.xrespond.com/api/social/all/downloader",
      form,
      {
        headers: {
          ...form.getHeaders(),
          origin: "https://downsocial.io",
          referer: "https://downsocial.io/",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) Chrome/117 Safari/537.36"
        }
      }
    );

    // FIX the double slash JSON-escaped URLs
    let videoUrl =
      xResp.data?.data?.video?.no_wm ||
      xResp.data?.data?.media || 
      null;

    if (!videoUrl) return res.json({ error: "No video found." });

    videoUrl = videoUrl.replace(/^\/\//, "https://");

    // Download and save
    const videoId = Date.now() + ".mp4";
    const filePath = path.join(VIDEO_DIR, videoId);

    const videoStream = await axios.get(videoUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    videoStream.data.pipe(writer);

    await new Promise((resolve) => writer.on("finish", resolve));

    // Your hosted file
    const hostedUrl = `${req.protocol}://${req.get("host")}/videos/${videoId}`;

    res.json({
      success: true,
      hosted: hostedUrl,
      original: videoUrl
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      details: err.response?.data
    });
  }
});

// Serve videos
app.use("/videos", express.static(VIDEO_DIR));

app.listen(PORT, () => console.log("Server running on port " + PORT));
