# SVG Generation Configuration Guide

This document explains how to configure the SVG generation services in spx-backend.

## Environment Variables

The following environment variables have been added to support SVG generation functionality:

### SVG.IO Provider

SVG.IO is a direct SVG generation service that provides high-quality vector graphics.

```bash
# Enable/disable the SVG.IO provider
SVGIO_ENABLED=true

# SVG.IO API base URL
SVGIO_BASE_URL=https://api.svg.io

# API endpoint for image generation
SVGIO_GENERATE_ENDPOINT=/v1/generate-image

# Request timeout
SVGIO_TIMEOUT=60s

# Maximum retry attempts
SVGIO_MAX_RETRIES=3

# API key (required for production use)
# SVGIO_API_KEY=your_svgio_api_key_here
```

### Recraft Provider

Recraft is an AI-powered image generation service that can create high-quality images and convert them to SVG format.

```bash
# Enable/disable the Recraft provider
RECRAFT_ENABLED=true

# Recraft API base URL
RECRAFT_BASE_URL=https://external.api.recraft.ai

# API endpoints
RECRAFT_GENERATE_ENDPOINT=/v1/images/generations
RECRAFT_VECTORIZE_ENDPOINT=/v1/images/vectorize

# Default model to use
RECRAFT_DEFAULT_MODEL=recraftv3

# Supported models (comma-separated)
RECRAFT_SUPPORTED_MODELS=recraftv3,recraftv2

# Request timeout
RECRAFT_TIMEOUT=60s

# Maximum retry attempts
RECRAFT_MAX_RETRIES=3

# API key (required for production use)
# RECRAFT_API_KEY=your_recraft_api_key_here
```

### OpenAI Compatible Provider for SVG Generation

This provider uses OpenAI-compatible APIs to generate SVG code directly using large language models.

```bash
# Enable/disable the OpenAI SVG provider
SVG_OPENAI_ENABLED=true

# API base URL (supports OpenAI, Claude, and other compatible services)
SVG_OPENAI_BASE_URL=https://api.qnaigc.com/v1/

# Default model to use for SVG generation
SVG_OPENAI_DEFAULT_MODEL=claude-4.0-sonnet

# Maximum tokens for generation
SVG_OPENAI_MAX_TOKENS=4000

# Temperature for generation (0.0 - 1.0)
SVG_OPENAI_TEMPERATURE=0.7

# Request timeout
SVG_OPENAI_TIMEOUT=60s

# Maximum retry attempts
SVG_OPENAI_MAX_RETRIES=3

# API key (required for production use)
# SVG_OPENAI_API_KEY=your_openai_compatible_api_key_here
```

### Translation Service

The translation service is used to translate prompts from Chinese to English when using providers that don't support Chinese input.

```bash
# Enable/disable translation service
TRANSLATION_ENABLED=true

# Translation service URL
TRANSLATION_SERVICE_URL=https://api.qnaigc.com/v1/chat/completions

# Model to use for translation
TRANSLATION_DEFAULT_MODEL=claude-4.0-sonnet

# Request timeout
TRANSLATION_TIMEOUT=45s

# Maximum retry attempts
TRANSLATION_MAX_RETRIES=2

# API key for translation service
# TRANSLATION_API_KEY=your_translation_api_key_here
```

## API Endpoints

The following API endpoints are now available:

### POST /image/svg
Generates and returns SVG content directly.

**Request Body:**
```json
{
  "prompt": "A cute cartoon cat sitting on a cloud",
  "style": "vector_illustration",
  "provider": "svgio",
  "negative_prompt": "ugly, blurred",
  "skip_translate": false,
  "model": "recraftv3",
  "size": "1024x1024",
  "substyle": "flat",
  "n": 1
}
```

**Response:**
- Content-Type: `image/svg+xml`
- Body: SVG file content
- Headers include metadata (ID, dimensions, provider, etc.)

### POST /image
Generates an image and returns metadata information.

**Request Body:** Same as above

**Response:**
```json
{
  "id": "svgio_1234567890",
  "svg_url": "https://example.com/generated.svg",
  "png_url": "https://example.com/generated.png",
  "width": 1024,
  "height": 1024,
  "provider": "svgio",
  "original_prompt": "一只可爱的猫",
  "translated_prompt": "A cute cat",
  "was_translated": true,
  "created_at": "2025-01-01T12:00:00Z"
}
```

### POST /character/style/change
Changes character styling while preserving character identity.

**Request Body (multipart/form-data):**
```
image: [PNG file]                      # Required: Character image to be restyled
style_prompt: "change to casual clothes" # Required: Description of style changes
strength: 0.3                         # Optional: Transformation strength (0-1, default: 0.3)
style: "realistic_image"               # Optional: Image style
sub_style: "detailed"                  # Optional: Sub-style
negative_prompt: "ugly, distorted"     # Optional: What to avoid
provider: "recraft"                    # Optional: Provider (default: recraft)
preserve_identity: true                # Optional: Preserve character identity (default: true)
```

**Response:**
```json
{
  "id": "recraft_style_1234567890",
  "url": "https://example.com/styled-character.png",
  "kodo_url": "https://kodo.example.com/styled-character.svg",
  "ai_resource_id": 12345,
  "original_prompt": "change to casual clothes",
  "style_prompt": "保持角色的面部特征、体型和基本外观不变，只改变change to casual clothes，确保角色身份完全保持不变",
  "negative_prompt": "ugly, distorted, 改变面部特征, 改变角色身份, 不同的人",
  "style": "realistic_image",
  "strength": 0.3,
  "width": 1024,
  "height": 1024,
  "provider": "recraft",
  "preserve_identity": true,
  "created_at": "2025-01-01T12:00:00Z"
}
```

## Provider Selection

You can specify which provider to use in the request:

- `"svgio"` - SVG.IO service (default)
- `"recraft"` - Recraft AI service
- `"openai"` - OpenAI-compatible LLM service

Each provider has different strengths:

- **SVG.IO**: Direct SVG generation, good for simple vector graphics
- **Recraft**: High-quality AI image generation with vectorization, supports image beautification and character style changes
- **OpenAI**: LLM-powered SVG code generation, highly customizable

## Development Setup

1. Copy the environment variables from `.env.dev` to your local environment
2. Uncomment and set the API keys for the providers you want to use
3. Adjust the base URLs and models as needed for your setup
4. Start the server and test the endpoints

## Production Considerations

1. **API Keys**: Ensure all production API keys are properly secured
2. **Rate Limiting**: Consider implementing rate limiting for the SVG generation endpoints
3. **Caching**: Consider caching generated SVGs to reduce API costs
4. **Monitoring**: Monitor API usage and costs for each provider
5. **Fallbacks**: Configure multiple providers for redundancy

## Example Usage

```bash
# Generate SVG directly
curl -X POST http://localhost:8080/image/svg \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A minimalist mountain landscape",
    "style": "flat_vector",
    "provider": "svgio"
  }' \
  -o generated.svg

# Get image metadata
curl -X POST http://localhost:8080/image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city skyline",
    "provider": "recraft",
    "model": "recraftv3",
    "size": "1024x1024"
  }'

# Change character style
curl -X POST http://localhost:8080/character/style/change \
  -F "image=@character.png" \
  -F "style_prompt=change to medieval knight armor" \
  -F "strength=0.4" \
  -F "preserve_identity=true" \
  -F "provider=recraft"
```