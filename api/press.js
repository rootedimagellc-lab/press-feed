import { google } from "googleapis";
import mammoth from "mammoth";

function cleanTitle(name) {
  return String(name || "")
    .replace(/\.docx$/i, "")
    .replace(/\.doc$/i, "")
    .trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/drive.readonly"]
    );

    const drive = google.drive({
      version: "v3",
      auth
    });

    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,createdTime,webViewLink)",
      orderBy: "createdTime desc"
    });

    const files = response.data.files || [];
    const posts = [];

    for (const file of files) {
      const isDocx =
        file.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (!isDocx) {
        continue;
      }

      const download = await drive.files.get(
        {
          fileId: file.id,
          alt: "media"
        },
        {
          responseType: "arraybuffer"
        }
      );

      const buffer = Buffer.from(download.data);
      const result = await mammoth.extractRawText({ buffer });
      const content = (result.value || "").trim();

      posts.push({
        title: cleanTitle(file.name),
        date: file.createdTime,
        url: file.webViewLink,
        content
      });
    }

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}
