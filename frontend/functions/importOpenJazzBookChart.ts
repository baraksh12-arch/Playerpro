import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug, title, composer, key, style, form } = await req.json();

    if (!slug || !title) {
      return Response.json({ error: 'Missing slug or title' }, { status: 400 });
    }

    // Fetch only the original PDF from OpenJazzBook
    const pdfUrl = `https://openjazzbook.com/assets/themes/${slug}/${slug}-lead-sheet.pdf`;
    
    const response = await fetch(`${pdfUrl}?download=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      }
    });
    
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch PDF: HTTP ${response.status}` }, { status: 400 });
    }

    const pdfBlob = await response.blob();
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const file = new File([fileBlob], `${slug}-lead-sheet.pdf`, { type: 'application/pdf' });
    
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    
    // Build version URLs for all available transpositions on OpenJazzBook
    // Format: slug-2, slug-3, slug-4, slug-5 for different keys
    const versions = [
      { key: 'C (1)', url: pdfUrl, pageUrl: `https://openjazzbook.com/${slug}` },
      { key: 'C (2)', url: `https://openjazzbook.com/assets/themes/${slug}/${slug}-2-lead-sheet.pdf`, pageUrl: `https://openjazzbook.com/${slug}?version=${slug}-2` },
      { key: 'Bb', url: `https://openjazzbook.com/assets/themes/${slug}/${slug}-3-lead-sheet.pdf`, pageUrl: `https://openjazzbook.com/${slug}?version=${slug}-3` },
      { key: 'Eb', url: `https://openjazzbook.com/assets/themes/${slug}/${slug}-4-lead-sheet.pdf`, pageUrl: `https://openjazzbook.com/${slug}?version=${slug}-4` },
      { key: 'Bass', url: `https://openjazzbook.com/assets/themes/${slug}/${slug}-5-lead-sheet.pdf`, pageUrl: `https://openjazzbook.com/${slug}?version=${slug}-5` },
    ];

    // Create material with versions stored in description as JSON
    const material = await base44.asServiceRole.entities.Material.create({
      title: `${title} - Lead Sheet`,
      description: `Jazz Standard Lead Sheet\nComposer: ${composer || 'Unknown'}\nKey: ${key || 'C'}\nForm: ${form || 'Standard'}\nStyle: ${style || 'Jazz'}\n\nSource: OpenJazzBook.com\n\n__VERSIONS__${JSON.stringify(versions)}`,
      type: 'pdf',
      file_url: uploadResult.file_url,
      tags: ['lead sheet', 'jazz', 'OpenJazzBook', style || 'jazz', slug].filter(Boolean),
      is_template: true,
      is_private: false,
    });

    return Response.json({
      success: true,
      materialId: material.id,
      fileUrl: uploadResult.file_url,
      versions,
      message: `Successfully imported "${title}" lead sheet with ${versions.length} transposition versions`
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});