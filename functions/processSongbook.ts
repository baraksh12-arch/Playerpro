import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, filename } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    // Use AI to analyze the songbook and extract song titles with page numbers
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this music songbook PDF/image. Extract ALL song titles you can see with their page numbers.

Return JSON:
{
  "bookTitle": "name of the songbook if visible",
  "songs": [
    { "title": "Song Name", "composer": "if visible", "page": 1, "key": "if visible" },
    { "title": "Another Song", "composer": "...", "page": 2, "key": "..." }
  ],
  "totalPages": estimated total pages
}

Be thorough - extract EVERY song title visible in table of contents or headers.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          bookTitle: { type: "string" },
          songs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                composer: { type: "string" },
                page: { type: "number" },
                key: { type: "string" }
              }
            }
          },
          totalPages: { type: "number" }
        }
      }
    });

    // Create a songbook index record
    const songbook = await base44.asServiceRole.entities.Material.create({
      title: analysis.bookTitle || filename || 'Uploaded Songbook',
      description: `Songbook with ${analysis.songs?.length || 0} songs indexed.\n\nSongs: ${analysis.songs?.map(s => s.title).join(', ') || 'Scanning...'}`,
      type: 'pdf',
      file_url: file_url,
      tags: ['songbook', 'indexed', ...(analysis.songs?.slice(0, 20).map(s => s.title.toLowerCase()) || [])],
      is_template: true,
      is_private: false,
    });

    // Store song index in a separate searchable format
    // We'll create individual index entries that point back to the songbook
    const indexEntries = [];
    
    if (analysis.songs?.length) {
      for (const song of analysis.songs) {
        indexEntries.push({
          songTitle: song.title,
          composer: song.composer || '',
          page: song.page,
          key: song.key || '',
          songbookId: songbook.id,
          songbookUrl: file_url,
          songbookTitle: analysis.bookTitle || filename
        });
      }
    }

    return Response.json({
      success: true,
      songbookId: songbook.id,
      bookTitle: analysis.bookTitle,
      songsIndexed: analysis.songs?.length || 0,
      songs: indexEntries,
      message: `Indexed ${analysis.songs?.length || 0} songs from songbook`
    });

  } catch (error) {
    console.error('Process songbook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});