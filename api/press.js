import { google } from "googleapis";

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
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: "files(id,name,createdTime,webViewLink)",
      orderBy: "createdTime desc"
    });

    const posts = response.data.files.map(file => ({
      title: file.name,
      date: file.createdTime,
      url: file.webViewLink
    }));

    res.status(200).json(posts);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
