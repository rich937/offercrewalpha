curl -X POST https://api.heygen.com/v2/video/generate \
-H "Content-Type: application/json" \
-H "X-Api-Key: sk_V2_hgu_kA8vW3dVA2I_49kxewlDobD7l6sOahNWKSTbdeBHtLuf" \
-d '{
  "video_inputs": [
    {
      "character": {
        "type": "avatar",
        "avatar_id": "c1b8b344aa15421ebba93018bbf26ca0"
      },
      "voice": {
        "type": "text",
        "input_text": "Hey there! I just reviewed this credit card offer and wow... let me break it down for you.",
        "voice_id": "16a09e4706f74997ba4ed05ea11470f6"
      },
      "background": {
        "type": "color",
        "value": "#0F172A"
      }
    }
  ],
  "aspect_ratio": "9:16",
  "caption": true,
  "watermark": {
    "type": "image",
    "url": "https://offercrewalpha.vercel.app/logo.png"
  },
  "callback_id": "avatar-iii-9-16"
}'

// https://grok.x.ai/generated/transparent-offercrew-logo.png