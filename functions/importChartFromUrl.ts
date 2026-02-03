import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, title: providedTitle, composer: providedComposer, key: providedKey, style: providedStyle } = await req.json();

    if (!url) {
      return Response.json({ error: 'Missing URL' }, { status: 400 });
    }

    // Fetch the file from URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,image/*,*/*',
      }
    });

    if (!response.ok) {
      return Response.json({ error: `Failed to fetch: ${response.status}` }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || '';
    const blob = await response.blob();

    // Determine file type
    let fileType = 'pdf';
    let extension = 'pdf';
    
    if (contentType.includes('image/png') || url.toLowerCase().endsWith('.png')) {
      fileType = 'image';
      extension = 'png';
    } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg') || url.toLowerCase().match(/\.(jpg|jpeg)$/)) {
      fileType = 'image';
      extension = 'jpg';
    } else if (contentType.includes('image/webp') || url.toLowerCase().endsWith('.webp')) {
      fileType = 'image';
      extension = 'webp';
    } else if (contentType.includes('image/gif') || url.toLowerCase().endsWith('.gif')) {
      fileType = 'image';
      extension = 'gif';
    }

    // Extract filename from URL
    const urlPath = new URL(url).pathname;
    const originalFilename = urlPath.split('/').pop() || 'imported-chart';
    const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Upload to Base44
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new File([blob], cleanFilename, { type: blob.type || (fileType === 'pdf' ? 'application/pdf' : `image/${extension}`) })
    });

    // Try to analyze the file with AI
    let analysis = null;
    try {
      analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyze this music chart/lead sheet image or PDF. Extract:
1. Song title (if visible)
2. Composer/artist (if visible)
3. Key signature
4. Style/genre (jazz, pop, classical, etc.)
5. Quality assessment

Return JSON: { title, composer, key, style, qualityScore: 0-100 }`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            composer: { type: "string" },
            key: { type: "string" },
            style: { type: "string" },
            qualityScore: { type: "number" }
          }
        }
      });
    } catch (e) {
      console.log('Analysis skipped:', e);
    }

    // Create material record - use provided values first, then fall back to AI analysis
    const title = providedTitle || analysis?.title || cleanFilename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const composer = providedComposer || analysis?.composer;
    const key = providedKey || analysis?.key;
    const style = providedStyle || analysis?.style;
    
    const material = await base44.asServiceRole.entities.Material.create({
      title: title,
      description: `${composer ? `By ${composer}\n` : ''}${key ? `Key: ${key}\n` : ''}${style ? `Style: ${style}\n` : ''}\nImported from URL`,
      type: fileType,
      file_url: file_url,
      tags: ['chart', 'lead sheet', 'imported', style || 'jazz', key].filter(Boolean),
      is_template: true,
      is_private: false,
    });

    return Response.json({
      success: true,
      material: {
        id: material.id,
        title: title,
        fileUrl: file_url,
        type: fileType
      },
      analysis: analysis
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});