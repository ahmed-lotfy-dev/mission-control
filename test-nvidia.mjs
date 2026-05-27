import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const envPath = join(homedir(), ".hermes", ".env");
const content = readFileSync(envPath, "utf-8");
const match = content.match(/^NVIDIA_API_KEY=(.+)$/m);
const key = match ? match[1].trim() : null;
if (!key) { console.log("No key"); process.exit(1); }

async function run() {
  // Get all models from the catalog
  const r = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` }
  });
  const data = await r.json();
  
  const allModels = data.data || [];
  console.log("Total models:", allModels.length);
  
  // Find image-related models
  const imageRelated = allModels.filter(m => {
    const id = (m.id || "").toLowerCase();
    return id.includes("flux") || id.includes("diffusion") || id.includes("sdxl") || 
           id.includes("stable") || id.includes("playground") || id.includes("sana") ||
           id.includes("pixart") || id.includes("kandinsky") || id.includes("dall") ||
           id.includes("imagen") || id.includes("deepfloyd") || id.includes("würstchen") ||
           id.includes("image") || id.includes("video") || id.includes("cosmos");
  });
  
  console.log("\nImage/Video-related models:");
  if (imageRelated.length === 0) {
    console.log("  None found. These models may have been removed from the catalog.");
  } else {
    for (const m of imageRelated) {
      console.log(`  ${m.id} (owned by: ${m.owned_by})`);
    }
  }
  
  // Try to test the chat completions endpoint with a simple image generation approach
  // Some models support image generation via tool calls
  console.log("\n\n--- Testing chat completions for image gen availability ---");
  try {
    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: "Say 'API works' if you receive this message" }],
        max_tokens: 20,
      }),
    });
    const text = await resp.text();
    console.log("Chat status:", resp.status);
    if (resp.ok) console.log("Chat works!", text.slice(0, 200));
    else console.log("Chat error:", text.slice(0, 200));
  } catch(e) {
    console.log("Chat error:", e.message);
  }
}

run();