const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── HTML Decoder ─────────────────────────────────────────────────────────────
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
        .replace(/&#039;/g, "'").replace(/&#91;\d+&#93;/gi, '').replace(/\[\d+\]/gi, '');
}

// ─── Clean artist name from YouTube junk ──────────────────────────────────────
// "Atena - Topic" → "Atena", "ArtistVEVO" → "Artist"
function cleanArtistName(name) {
    if (!name) return '';
    return name
        .replace(/\s*-\s*Topic$/i, '')
        .replace(/VEVO$/i, '')
        .replace(/\s*-\s*Official$/i, '')
        .replace(/\s*Official$/i, '')
        .trim();
}

// ─── iTunes Search API ────────────────────────────────────────────────────────
// Free, no key. Covers Western + JP/KR music. Returns genre, release date, album, artwork.
async function fetchITunes(title, artist) {
    try {
        const q = artist ? `${title} ${artist}` : title;
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=8&lang=en_us`;
        const res = await fetch(url, { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json.results || json.results.length === 0) return null;

        // Try to find the closest title match
        const lowerTitle = title.toLowerCase();
        let best = json.results.find(r => r.trackName?.toLowerCase().includes(lowerTitle))
            || json.results.find(r => lowerTitle.includes(r.trackName?.toLowerCase()))
            || json.results[0];

        // Upgrade artwork to 600x600
        const artworkUrl = best.artworkUrl100?.replace('100x100bb', '600x600bb') || null;

        return {
            trackName: best.trackName,
            artistName: best.artistName,
            albumName: best.collectionName,
            genre: best.primaryGenreName,
            releaseDate: best.releaseDate ? best.releaseDate.substring(0, 10) : null,
            artworkUrl,
            previewUrl: best.previewUrl || null,
            trackViewUrl: best.trackViewUrl || null,
            country: best.country || null,
            explicit: best.trackExplicitness === 'explicit',
            trackNumber: best.trackNumber || null,
            trackCount: best.trackCount || null,
            discNumber: best.discNumber || null,
        };
    } catch (e) {
        console.error('[SongInfo] iTunes error:', e.message);
        return null;
    }
}

// ─── Deezer API ───────────────────────────────────────────────────────────────
// Free, no auth. Good global catalog, returns BPM, rank, duration confirmation.
async function fetchDeezer(title, artist) {
    try {
        const q = artist ? `${title} ${artist}` : title;
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`;
        const res = await fetch(url, { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } });
        if (!res.ok) return null;
        const json = await res.json();
        const tracks = json.data;
        if (!tracks || tracks.length === 0) return null;

        const lowerTitle = title.toLowerCase();
        const best = tracks.find(t => t.title?.toLowerCase().includes(lowerTitle)) || tracks[0];

        // Fetch track details for BPM etc
        const detailRes = await fetch(`https://api.deezer.com/track/${best.id}`, {
            headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' }
        });
        let bpm = null, rank = null, albumCover = null, releaseDate = null, genres = [];
        if (detailRes.ok) {
            const detail = await detailRes.json();
            bpm = detail.bpm && detail.bpm > 0 ? Math.round(detail.bpm) : null;
            rank = detail.rank ? detail.rank.toLocaleString() : null;
            albumCover = detail.album?.cover_xl || detail.album?.cover_big || null;
            releaseDate = detail.release_date || null;
            genres = detail.genres?.data?.map(g => g.name) || [];
        }

        return {
            trackName: best.title,
            artistName: best.artist?.name,
            albumName: best.album?.title,
            albumCover: albumCover || best.album?.cover_big,
            bpm,
            rank,
            releaseDate,
            genres,
            deezerUrl: best.link || `https://deezer.com/track/${best.id}`,
            previewUrl: best.preview || null,
            explicit: best.explicit_lyrics || false,
        };
    } catch (e) {
        console.error('[SongInfo] Deezer error:', e.message);
        return null;
    }
}

// ─── Last.fm Lookup ───────────────────────────────────────────────────────────
async function fetchLastFm(title, artist) {
    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=dde09d4eed0fb9ce95994f2fa9c1aad8&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&format=json&autocorrect=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.error) return null;
        const track = json.track;
        if (!track) return null;

        const tags = track.toptags?.tag?.map(t => t.name).filter(t => t !== 'seen live').slice(0, 4) || [];
        const wiki = track.wiki?.summary
            ? track.wiki.summary.replace(/<a[^>]*>.*?<\/a>/gi, '').replace(/<[^>]*>/g, '').trim()
            : null;

        return {
            playcount: track.playcount ? parseInt(track.playcount).toLocaleString() : null,
            listeners: track.listeners ? parseInt(track.listeners).toLocaleString() : null,
            tags,
            wiki,
            url: track.url || null,
            album: track.album?.title || null,
        };
    } catch (e) { return null; }
}

// ─── Genius Auto-Search ───────────────────────────────────────────────────────
async function searchGenius(title, artist) {
    try {
        const q = artist ? `${title} ${artist}` : title;
        const res = await fetch(`https://genius.com/api/search/song?q=${encodeURIComponent(q)}&per_page=5`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!res.ok) return null;
        const json = await res.json();
        const hits = json?.response?.sections?.[0]?.hits || [];
        if (hits.length === 0) return null;

        const lowerTitle = title.toLowerCase();
        const best = hits.find(h => h.result?.title?.toLowerCase().includes(lowerTitle)) || hits[0];
        const result = best.result;

        return {
            title: result.title,
            artist: result.primary_artist?.name,
            coverArt: result.song_art_image_thumbnail_url || result.header_image_thumbnail_url || null,
            url: result.url || null,
            description: result.full_title,
            sourceName: 'Genius'
        };
    } catch (e) { return null; }
}

// ─── Wikipedia Lookup ─────────────────────────────────────────────────────────
async function fetchWikiInfo(title, artist) {
    try {
        for (const q of [`${title} ${artist} song`, `${title} ${artist}`, artist]) {
            const searchRes = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&origin=*`,
                { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
            );
            if (!searchRes.ok) continue;
            const searchData = await searchRes.json();
            const firstResult = searchData.query?.search?.[0];
            if (!firstResult) continue;

            const summaryRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title.replace(/ /g, '_'))}`,
                { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
            );
            if (!summaryRes.ok) continue;
            const summaryData = await summaryRes.json();
            if (summaryData.type === 'disambiguation') continue;

            return {
                summary: summaryData.extract,
                url: summaryData.content_urls?.desktop?.page,
                thumbnail: summaryData.thumbnail?.source,
                type: firstResult.title.toLowerCase().includes(artist.toLowerCase()) && !firstResult.title.toLowerCase().includes(title.toLowerCase()) ? 'artist' : 'song'
            };
        }
    } catch (e) {}
    return null;
}

// ─── LRCLIB metadata (album name only — no lyrics in songinfo) ─────────────────
async function fetchLrcLibMeta(title, artist) {
    try {
        const res = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
        );
        if (!res.ok) return null;
        const results = await res.json();
        const match = results?.find(r => r.plainLyrics || r.syncedLyrics);
        if (!match) return null;
        return { albumName: match.albumName, artistName: match.artistName, trackName: match.trackName };
    } catch (e) { return null; }
}

// ─── Fandom URL Parser ────────────────────────────────────────────────────────
async function parseFandomUrl(url) {
    const m = url.match(/https?:\/\/([^.]+)\.fandom\.com\/wiki\/(.+)/i);
    if (!m) return null;

    const subdomain = m[1];
    const pageTitle = decodeURIComponent(m[2]);

    const [parseRes, imageRes] = await Promise.all([
        fetch(`https://${subdomain}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }),
        fetch(`https://${subdomain}.fandom.com/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(pageTitle)}&format=json&piprop=thumbnail&pithumbsize=600&origin=*`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } })
    ]);

    let description = '', coverArt = null;

    if (parseRes.ok) {
        const parseJson = await parseRes.json();
        const html = parseJson.parse?.text?.['*'] || '';
        const noiseWords = ['ranked on', 'Billboard', 'surpassed', 'views', 'uploaded', 'interpretation', 'music video', 'featured on', 'featured in'];
        const pMatches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
        const descParagraphs = [];
        for (const pm of pMatches) {
            const pText = decodeHtml(pm[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
            if (pText.length < 5) continue;
            if (!noiseWords.some(n => pText.includes(n)) && descParagraphs.length < 4) {
                descParagraphs.push(pText);
            }
        }
        description = descParagraphs.join('\n\n');
    }

    if (imageRes.ok) {
        const imgJson = await imageRes.json();
        const page = Object.values(imgJson.query?.pages || {})[0];
        if (page?.thumbnail?.source) coverArt = page.thumbnail.source;
    }

    const cleanTitle = pageTitle.replace(/_/g, ' ');
    const wikiName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);

    return {
        title: cleanTitle,
        artist: `${wikiName} Wiki`,
        description: description || 'No summary available.',
        coverArt,
        url,
        sourceName: `${wikiName} Fandom Wiki`
    };
}

// ─── Genius URL Parser ────────────────────────────────────────────────────────
async function parseGeniusUrl(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i'));
        if (m) { const cm = m[0].match(/content=["'](.*?)["']/i); if (cm) return cm[1]; }
        return null;
    };
    const rawTitle = getMeta('og:title') || 'Genius Song';
    const cleanTitle = decodeHtml(rawTitle.replace(/\s*\|\s*Genius\s*Lyrics/gi, ''));
    const coverArt = getMeta('og:image') || null;
    const description = decodeHtml(getMeta('og:description') || '');
    let artist = 'Unknown Artist';
    if (cleanTitle.includes('–')) artist = cleanTitle.split('–')[0].trim();
    else if (cleanTitle.includes(' - ')) artist = cleanTitle.split(' - ')[0].trim();
    return { title: cleanTitle, artist, description, coverArt, url, sourceName: 'Genius' };
}

// ─── Determine source name from URI ───────────────────────────────────────────
function getSourceLabel(uri) {
    if (!uri) return null;
    if (uri.includes('spotify.com')) return '🎵 Spotify';
    if (uri.includes('youtube.com') || uri.includes('youtu.be')) return '▶ YouTube';
    if (uri.includes('music.youtube.com')) return '▶ YouTube Music';
    if (uri.includes('soundcloud.com')) return '☁ SoundCloud';
    if (uri.includes('deezer.com')) return '🎶 Deezer';
    if (uri.includes('tidal.com')) return '🌊 Tidal';
    if (uri.includes('bandcamp.com')) return '🏕 Bandcamp';
    return '🔗 Source';
}

// ─── Module Export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('songinfo')
        .setDescription('Displays rich info, cover art, genre, stats and links for any song.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL (optional if music is playing in voice channel)')
                .setRequired(false)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const locale = interaction.locale || 'en-US';
        await this.handleSongInfo(interaction, interaction.client, interaction.guild.id, query, true, locale);
    },

    async executePrefix(message, args) {
        const query = args.length > 0 ? args.join(' ') : null;
        const locale = message.guild?.preferredLocale || 'en-US';
        await this.handleSongInfo(message, message.client, message.guild.id, query, false, locale);
    },

    async handleSongInfo(context, client, guildId, query, isSlash, locale = 'en-US') {
        if (isSlash) {
            await context.deferReply();
        } else {
            var loadingMsg = await context.reply('🔍 *Retrieving song details, please wait...*');
        }

        const reply = async (payload) => {
            if (isSlash) return await context.editReply(payload);
            if (loadingMsg) await loadingMsg.delete().catch(() => {});
            return await context.reply(payload);
        };

        // ── Branch 1: Direct URL ──────────────────────────────────────────────
        if (query && (query.includes('fandom.com/wiki/') || query.includes('genius.com'))) {
            try {
                const parsed = query.includes('fandom.com/wiki/')
                    ? await parseFandomUrl(query)
                    : await parseGeniusUrl(query);

                if (!parsed) return await reply('❌ Could not load data from the provided link.');

                const embed = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle(`🎵 ${parsed.title}`)
                    .setDescription(
                        `**Artist:** ${parsed.artist}\n` +
                        `**Source:** ${parsed.sourceName}\n\n` +
                        `**About:**\n${(parsed.description || '*No summary available.*').substring(0, 1500)}`
                    )
                    .setFooter({ text: `Use -lyrics <url> to see lyrics` })
                    .setTimestamp();

                if (parsed.coverArt) embed.setThumbnail(parsed.coverArt);

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('View Source').setStyle(ButtonStyle.Link).setURL(parsed.url)
                );

                return await reply({ embeds: [embed], components: [buttons] });
            } catch (e) {
                console.error('[SongInfo] URL parse error:', e);
                return await reply('❌ An error occurred while fetching data from that link.');
            }
        }

        // ── Resolve track from Lavalink ───────────────────────────────────────
        let rawTitle = '', rawArtist = '', coverArt = null;
        let durationMs = 0, trackUri = null;

        if (!query) {
            const player = client.activePlayers?.get(guildId);
            const currentTrack = player?.current;
            if (!currentTrack) return await reply('❌ No music is currently playing. Please specify a song name or link.');

            rawTitle = currentTrack.info.title;
            rawArtist = currentTrack.info.author || '';
            coverArt = currentTrack.info.artworkUrl || currentTrack.info.thumbnail || null;
            trackUri = currentTrack.info.uri;
            durationMs = currentTrack.info.length || 0;
        } else {
            const resolveQuery = query.startsWith('http') ? query : `ytsearch:${query}`;
            try {
                const res = await client.riffy.resolve({ query: resolveQuery, requester: isSlash ? context.user : context.author });
                if (!res?.tracks?.length) return await reply('❌ Could not find that song. Try a more specific title.');

                const track = res.tracks[0];
                rawTitle = track.info.title;
                rawArtist = track.info.author || '';
                coverArt = track.info.artworkUrl || track.info.thumbnail || null;
                trackUri = track.info.uri;
                durationMs = track.info.length || 0;
            } catch (err) {
                console.error('[SongInfo] Lavalink resolve failed:', err);
                rawTitle = query;
                rawArtist = '';
            }
        }

        // Clean up title & artist
        const cleanTitle = rawTitle
            .replace(/\((official|video|lyrics|audio|music|hd|4k|clip|mv|m\/v)\)/gi, '')
            .replace(/\[(official|video|lyrics|audio|music|hd|4k|clip|mv|m\/v)\]/gi, '')
            .replace(/\s+/g, ' ').trim();

        const cleanArtist = cleanArtistName(rawArtist);

        // Format duration
        const durationStr = durationMs > 0
            ? `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}`
            : null;

        // ── Round 1: Fetch all sources with title + cleaned artist ─────────────
        let [itunesData, deezerData, lastFmData, geniusData, wikiData, lrcData] = await Promise.allSettled([
            fetchITunes(cleanTitle, cleanArtist),
            fetchDeezer(cleanTitle, cleanArtist),
            fetchLastFm(cleanTitle, cleanArtist),
            searchGenius(cleanTitle, cleanArtist),
            fetchWikiInfo(cleanTitle, cleanArtist),
            fetchLrcLibMeta(cleanTitle, cleanArtist),
        ]).then(r => r.map(p => p.status === 'fulfilled' ? p.value : null));

        // ── Round 2: Retry failed sources with title-only (covers niche/JP songs) ─
        const retries = await Promise.allSettled([
            !itunesData ? fetchITunes(cleanTitle, '') : Promise.resolve(null),
            !deezerData ? fetchDeezer(cleanTitle, '') : Promise.resolve(null),
            !lastFmData && cleanArtist ? fetchLastFm(cleanTitle, '') : Promise.resolve(null),
            !geniusData ? searchGenius(cleanTitle, '') : Promise.resolve(null),
            !lrcData ? fetchLrcLibMeta(cleanTitle, '') : Promise.resolve(null),
        ]).then(r => r.map(p => p.status === 'fulfilled' ? p.value : null));

        if (!itunesData && retries[0]) itunesData = retries[0];
        if (!deezerData && retries[1]) deezerData = retries[1];
        if (!lastFmData && retries[2]) lastFmData = retries[2];
        if (!geniusData && retries[3]) geniusData = retries[3];
        if (!lrcData && retries[4]) lrcData = retries[4];

        // ── Score sources — pick the one with the most filled fields ──────────
        const scoreSource = (d) => {
            if (!d) return 0;
            return [d.albumName, d.genre || d.genres?.[0], d.releaseDate, d.artworkUrl || d.albumCover]
                .filter(Boolean).length;
        };

        // ── Merge: best value from any source, prioritised by data richness ───
        const displayTitle = itunesData?.trackName || deezerData?.trackName || lrcData?.trackName || cleanTitle;
        const displayArtist = itunesData?.artistName || deezerData?.artistName || lastFmData?.artist
            || lrcData?.artistName || cleanArtist || rawArtist;
        const displayAlbum = itunesData?.albumName || deezerData?.albumName || lastFmData?.album
            || lrcData?.albumName || null;

        // Collect all genre signals and deduplicate
        const genreSet = new Set();
        if (itunesData?.genre) genreSet.add(itunesData.genre);
        if (deezerData?.genres?.length) deezerData.genres.forEach(g => genreSet.add(g));
        if (lastFmData?.tags?.length) lastFmData.tags.forEach(t => genreSet.add(t));
        const allGenres = [...genreSet].slice(0, 5);

        const displayRelease = itunesData?.releaseDate || deezerData?.releaseDate || null;
        const displayBpm = deezerData?.bpm || null;
        const displayExplicit = itunesData?.explicit || deezerData?.explicit || false;
        const displayListeners = lastFmData?.listeners || null;
        const displayPlaycount = lastFmData?.playcount || null;
        const deezerRank = deezerData?.rank || null;
        const trackNum = itunesData?.trackNumber;
        const trackTotal = itunesData?.trackCount;
        const discNum = itunesData?.discNumber && itunesData.discNumber > 1 ? itunesData.discNumber : null;
        const previewUrl = deezerData?.previewUrl || itunesData?.previewUrl || null;

        // About: prefer Last.fm wiki → Wikipedia → Genius description
        const aboutText = lastFmData?.wiki
            || (wikiData?.summary ? wikiData.summary : null)
            || null;

        // Best cover art: iTunes 600px > Deezer XL > Genius > YouTube/track > wiki
        const displayCoverArt = itunesData?.artworkUrl
            || deezerData?.albumCover
            || geniusData?.coverArt
            || wikiData?.thumbnail
            || coverArt
            || null;

        // ── Build embed description ───────────────────────────────────────────
        const lines = [];

        lines.push(`**Artist:** ${displayArtist}`);
        if (durationStr) lines.push(`**Duration:** ${durationStr}`);
        if (displayAlbum) lines.push(`**Album:** ${displayAlbum}`);
        if (trackNum && trackTotal) {
            lines.push(`**Track:** ${trackNum} of ${trackTotal}${discNum ? ` (Disc ${discNum})` : ''}`);
        }
        if (displayRelease) {
            // Format: "2023" or "2023-04-15"
            const parts = displayRelease.split('-');
            const formatted = parts.length >= 3
                ? new Date(displayRelease).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : parts[0];
            lines.push(`**Released:** ${formatted}`);
        }
        if (allGenres.length > 0) {
            lines.push(`**Genre / Tags:** ${allGenres.join(' • ')}`);
        }
        if (displayBpm) lines.push(`**BPM:** ${displayBpm}`);
        if (displayExplicit) lines.push(`**🅴 Explicit content**`);

        // Stats line
        const statsArr = [];
        if (displayListeners) statsArr.push(`👥 ${displayListeners} listeners`);
        if (displayPlaycount) statsArr.push(`▶ ${displayPlaycount} scrobbles`);
        if (deezerRank) statsArr.push(`🏆 Deezer rank #${deezerRank}`);
        if (statsArr.length > 0) lines.push(statsArr.join('  •  '));

        // Sources that found this song
        const foundIn = [];
        if (itunesData) foundIn.push('iTunes');
        if (deezerData) foundIn.push('Deezer');
        if (lastFmData) foundIn.push('Last.fm');
        if (lrcData) foundIn.push('LRCLIB');
        if (geniusData) foundIn.push('Genius');
        if (wikiData) foundIn.push('Wikipedia');
        if (foundIn.length > 0) lines.push(`**Found on:** ${foundIn.join(', ')}`);

        // About section
        if (aboutText) {
            lines.push('');
            lines.push(`**About the ${wikiData?.type === 'artist' ? 'Artist' : 'Song'}:**`);
            lines.push(aboutText.substring(0, 900));
        }

        const description = lines.join('\n');

        // ── Build embed ───────────────────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`🎵 ${displayTitle}`)
            .setDescription(description.substring(0, 4000))
            .setFooter({ text: `Use \`-lyrics ${cleanTitle}\` to see lyrics` })
            .setTimestamp();

        if (displayCoverArt) embed.setThumbnail(displayCoverArt);

        // ── Buttons ───────────────────────────────────────────────────────────
        const buttons = new ActionRowBuilder();
        const sourceLabel = getSourceLabel(trackUri);

        if (trackUri && sourceLabel) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel(sourceLabel)
                .setStyle(ButtonStyle.Link)
                .setURL(trackUri)
            );
        }
        if (geniusData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('🎤 Genius')
                .setStyle(ButtonStyle.Link)
                .setURL(geniusData.url)
            );
        }
        if (itunesData?.trackViewUrl) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('🍎 Apple Music')
                .setStyle(ButtonStyle.Link)
                .setURL(itunesData.trackViewUrl)
            );
        }
        if (lastFmData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('🎵 Last.fm')
                .setStyle(ButtonStyle.Link)
                .setURL(lastFmData.url)
            );
        }
        if (wikiData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('📖 Wikipedia')
                .setStyle(ButtonStyle.Link)
                .setURL(wikiData.url)
            );
        }

        // Discord allows max 5 buttons per action row
        const payload = { embeds: [embed] };
        if (buttons.components.length > 0) {
            // Trim to 5
            buttons.components = buttons.components.slice(0, 5);
            payload.components = [buttons];
        }

        await reply(payload);
    }
};
