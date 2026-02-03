import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await req.json();

    if (!slug) {
      return Response.json({ error: 'Missing slug' }, { status: 400 });
    }

    // Fetch the OpenJazzBook page HTML
    const pageUrl = `https://openjazzbook.com/${slug}`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return Response.json({ error: `Failed to fetch page: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();

    // Extract all image URLs from the HTML - both with and without full domain
    // Pattern 1: Full URL with domain
    const fullUrlRegex = /https:\/\/openjazzbook\.com\/assets\/(themes|realbooks)\/[^"'\s\)]+\.png/g;
    // Pattern 2: Relative path in img src
    const relativeRegex = /src=["']?(\/assets\/(themes|realbooks)\/[^"'\s\)]+\.png)/g;
    // Pattern 3: Just the path after domain
    const pathRegex = /assets\/(themes|realbooks)\/[^"'\s\)]+\.png/g;
    
    const fullMatches = html.match(fullUrlRegex) || [];
    const relativeMatches = [...html.matchAll(relativeRegex)].map(m => `https://openjazzbook.com${m[1]}`);
    const pathMatches = [...html.matchAll(pathRegex)].map(m => `https://openjazzbook.com/${m[0]}`);
    
    // Combine and deduplicate all matches
    const allPngs = [...new Set([...fullMatches, ...relativeMatches, ...pathMatches])];
    
    // Filter out duplicates and tiny images (thumbnails)
    const uniquePngs = allPngs.filter(url => !url.includes('_thumb') && !url.includes('_small'));

    // Build versions array with proper labels based on URL patterns
    const versions = [];
    let versionNum = 1;
    
    // Sort: theme PNGs first, then realbook scans by type
    const themePngs = uniquePngs.filter(url => url.includes('/themes/'));
    const realbookC = uniquePngs.filter(url => url.includes('/the-real-book-1/') && !url.includes('-bb') && !url.includes('-eb') && !url.includes('-bass'));
    const realbookBb = uniquePngs.filter(url => url.includes('-bb-instruments/') || url.includes('the-real-book-1-bb/'));
    const realbookEb = uniquePngs.filter(url => url.includes('-eb-instruments/') || url.includes('the-real-book-1-eb/'));
    const realbookBass = uniquePngs.filter(url => url.includes('-bass/') || url.includes('the-real-book-1-bass/'));
    const newRealbook = uniquePngs.filter(url => url.includes('new-real-book'));
    
    // Add theme version first
    themePngs.forEach(url => {
      versions.push({ label: `C (v${versionNum})`, url, key: 'C' });
      versionNum++;
    });
    
    // Add Real Book C versions
    realbookC.forEach(url => {
      versions.push({ label: `C (v${versionNum})`, url, key: 'C' });
      versionNum++;
    });
    
    // Add Bb versions
    realbookBb.forEach(url => {
      versions.push({ label: `Bb (v${versionNum})`, url, key: 'Bb' });
      versionNum++;
    });
    
    // Add Eb versions
    realbookEb.forEach(url => {
      versions.push({ label: `Eb (v${versionNum})`, url, key: 'Eb' });
      versionNum++;
    });
    
    // Add Bass versions
    realbookBass.forEach(url => {
      versions.push({ label: `Bass (v${versionNum})`, url, key: 'Bass' });
      versionNum++;
    });
    
    // Add New Real Book versions
    newRealbook.forEach(url => {
      if (!versions.some(v => v.url === url)) {
        versions.push({ label: `C - NRB (v${versionNum})`, url, key: 'C' });
        versionNum++;
      }
    });

    // If no versions found, return the default theme URL
    if (versions.length === 0) {
      const defaultUrl = `https://openjazzbook.com/assets/themes/${slug}/${slug}-lead-sheet_1_2.png`;
      versions.push({
        label: 'C (v1)',
        url: defaultUrl,
        key: 'C'
      });
    }

    return Response.json({
      success: true,
      slug,
      pageUrl,
      versions,
      totalVersions: versions.length
    });

  } catch (error) {
    console.error('Fetch OJB versions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});