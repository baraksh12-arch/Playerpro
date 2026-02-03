import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { songbookUrl, pageNumber, songTitle, composer, key } = await req.json();

    if (!songbookUrl || !pageNumber || !songTitle) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use AI to extract just the specific page as an image
    const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `From this PDF songbook, I need to extract page ${pageNumber} which contains "${songTitle}".
      
Please analyze and confirm:
1. Is page ${pageNumber} the correct page for "${songTitle}"?
2. Describe what you see on that page.

Return JSON:
{
  "confirmed": true/false,
  "pageContent": "description of what's on the page",
  "actualTitle": "the actual title on the page if different"
}`,
      file_urls: [songbookUrl],
      response_json_schema: {
        type: "object",
        properties: {
          confirmed: { type: "boolean" },
          pageContent: { type: "string" },
          actualTitle: { type: "string" }
        }
      }
    });

    // For now, we'll create a reference material that links to the songbook with page info
    // In production, you'd use a PDF library to actually extract the page
    const material = await base44.asServiceRole.entities.Material.create({
      title: `${songTitle}${key ? ` (${key})` : ''}`,
      description: `${composer ? `By ${composer}\n` : ''}Extracted from songbook - Page ${pageNumber}\n\n${extractResult.pageContent || ''}`,
      type: 'pdf',
      file_url: `${songbookUrl}#page=${pageNumber}`,
      tags: ['chart', 'lead sheet', 'extracted', key].filter(Boolean),
      is_template: true,
      is_private: false,
    });

    return Response.json({
      success: true,
      materialId: material.id,
      title: songTitle,
      pageNumber,
      fileUrl: material.file_url
    });

  } catch (error) {
    console.error('Extract page error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});