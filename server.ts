import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();

// Check if credentials are valid and not masked (e.g. not bullets)
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.startsWith("•") && 
  (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"));

const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const app = express();
const PORT = 3000;

// Set high limit for JSON payloads to support Base64 file uploads
app.use(express.json({ limit: "50mb" }));

// Server API: Test connection
app.get("/api/sermons/test", async (req, res) => {
  try {
    if (!isConfigured || !supabase) {
      return res.status(500).json({ 
        code: "CONFIG_MISSING",
        error: "Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are either missing, invalid, or have not yet been specified in AI Studio Settings." 
      });
    }

    const { data, error } = await supabase.storage.from("sermons").list("", { limit: 1 });
    if (error) {
      console.error("Test storage access failed:", error);
      return res.status(500).json({ 
        code: "ACCESS_FAILED",
        error: `Could not connect to the 'sermons' bucket. Error: ${error.message}. Please verify the bucket exists and is public.`
      });
    }

    return res.json({ status: "ok", message: "Supabase Storage Connected and Ready!" });
  } catch (err: any) {
    console.error("Server test exception:", err);
    return res.status(500).json({ code: "INTERNAL_ERROR", error: err.message });
  }
});

// Server API: Upload PDF base64 payload to Supabase sermons storage bucket
app.post("/api/sermons/upload", async (req, res) => {
  try {
    if (!isConfigured || !supabase) {
      return res.status(500).json({ 
        code: "CONFIG_MISSING",
        error: "Supabase Storage is not configured. Please supply valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in AI Studio Secrets." 
      });
    }

    const { fileBase64, fileName, fileType } = req.body;
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ code: "BAD_REQUEST", error: "Missing file content or filename." });
    }

    // Recover actual file buffer from base64 string
    const fileBuffer = Buffer.from(fileBase64, "base64");
    const storagePath = `${Date.now()}_${fileName}`;

    console.log(`Uploading processed buffer (${fileBuffer.length} bytes) to path: sermons/${storagePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("sermons")
      .upload(storagePath, fileBuffer, {
        contentType: fileType || "application/pdf",
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Storage API upload error:", uploadError);
      return res.status(500).json({ 
        code: (uploadError as any).statusCode || "UPLOAD_ERROR", 
        error: uploadError.message 
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("sermons")
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    return res.json({ publicUrl, storagePath });
  } catch (err: any) {
    console.error("Exception in backend upload handler:", err);
    return res.status(500).json({ code: "SERVER_EXCEPTION", error: err.message || "An internal error occurred during file upload sync" });
  }
});

// Server API: Delete file from Supabase sermons bucket
app.post("/api/sermons/delete", async (req, res) => {
  try {
    if (!isConfigured || !supabase) {
      return res.status(500).json({ 
        code: "CONFIG_MISSING",
        error: "Supabase Storage is not configured." 
      });
    }

    const { storagePath } = req.body;
    if (!storagePath) {
      return res.status(400).json({ code: "BAD_REQUEST", error: "Missing target storagePath." });
    }

    const { error: deleteError } = await supabase.storage
      .from("sermons")
      .remove([storagePath]);

    if (deleteError) {
      console.error("Supabase Storage API delete error:", deleteError);
      return res.status(500).json({ code: "DELETE_ERROR", error: deleteError.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Exception in backend delete handler:", err);
    return res.status(500).json({ code: "SERVER_EXCEPTION", error: err.message || "An internal error occurred during file delete" });
  }
});

// Setup Vite Development Middleware or Serve Static Build Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Church of Christ web server successfully active on port ${PORT}`);
  });
}

startServer();
