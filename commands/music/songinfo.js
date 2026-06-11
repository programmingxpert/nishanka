const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── HTML Decoder ─────────────────────────────────────────────────────────────
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&#91;\d+&#93;/gi, '')
        .replace(/\[\d+\]/gi, '');
}

// ─── Romaji → Katakana ────────────────────────────────────────────────────────
function romajiToKatakana(romaji) {
    const mapping = {
        'sha': 'シャ', 'shu': 'シュ', 'sho': 'ショ',
        'cha': 'チャ', 'chu': 'チュ', 'cho': 'チョ',
        'ja': 'ジャ', 'ju': 'ジュ', 'jo': 'ジョ',
        'tsu': 'ツ', 'chi': 'チ', 'shi': 'シ',
        'kya': 'キャ', 'kyu': 'キュ', 'kyo': 'キョ',
        'sya': 'シャ', 'syu': 'シュ', 'syo': 'ショ',
        'nya': 'ニャ', 'nyu': 'ニュ', 'nyo': 'ニョ',
        'hya': 'ヒャ', 'hyu': 'ヒュ', 'hyo': 'ヒョ',
        'mya': 'ミャ', 'myu': 'ミュ', 'myo': 'ミョ',
        'rya': 'リャ', 'ryu': 'リュ', 'ryo': 'リョ',
        'gya': 'ギャ', 'gyu': 'ギュ', 'gyo': 'ギョ',
        'bya': 'ビャ', 'byu': 'ビュ', 'byo': 'ビョ',
        'pya': 'ピャ', 'pyu': 'ピュ', 'pyo': 'ピョ',
        'ka': 'カ', 'ki': 'キ', 'ku': 'ク', 'ke': 'ケ', 'ko': 'コ',
        'sa': 'サ', 'si': 'シ', 'su': 'ス', 'se': 'セ', 'so': 'ソ',
        'ta': 'タ', 'ti': 'チ', 'tu': 'ツ', 'te': 'テ', 'to': 'ト',
        'na': 'ナ', 'ni': 'ニ', 'nu': 'ヌ', 'ne': 'ネ', 'no': 'ノ',
        'ha': 'ハ', 'hi': 'ヒ', 'hu': 'フ', 'fu': 'フ', 'he': 'ヘ', 'ho': 'ホ',
        'ma': 'マ', 'mi': 'ミ', 'mu': 'ム', 'me': 'メ', 'mo': 'モ',
        'ya': 'ヤ', 'yu': 'ユ', 'yo': 'ヨ',
        'ra': 'ラ', 'ri': 'リ', 'ru': 'ル', 're': 'レ', 'ro': 'ロ',
        'wa': 'ワ', 'wo': 'ヲ', 'nn': 'ン',
        'ga': 'ガ', 'gi': 'ギ', 'gu': 'グ', 'ge': 'ゲ', 'go': 'ゴ',
        'za': 'ザ', 'ji': 'ジ', 'zu': 'ズ', 'ze': 'ゼ', 'zo': 'ゾ',
        'da': 'ダ', 'di': 'ヂ', 'du': 'ヅ', 'de': 'デ', 'do': 'ド',
        'ba': 'バ', 'bi': 'ビ', 'bu': 'ブ', 'be': 'ベ', 'bo': 'ボ',
        'pa': 'パ', 'pi': 'ピ', 'pu': 'プ', 'pe': 'ペ', 'po': 'ポ',
        'fa': 'ファ', 'fi': 'フィ', 'fe': 'フェ', 'fo': 'フォ',
        'va': 'ヴァ', 'vi': 'ヴィ', 'vu': 'ヴ', 've': 'ヴェ', 'vo': 'ヴォ',
        'a': 'ア', 'i': 'イ', 'u': 'ウ', 'e': 'エ', 'o': 'オ', 'n': 'ン'
    };

    let result = romaji.toLowerCase();
    result = result.replace(/cch/g, 'ッch').replace(/tch/g, 'ッch');
    result = result.replace(/([kstp])\1/g, 'ッ$1');

    const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        result = result.replace(new RegExp(key, 'g'), mapping[key]);
    }
    return result;
}

// ─── Trilingual Lyric Formatter ───────────────────────────────────────────────
function formatLyricsForDisplay(japaneseLines, romajiLines, englishLines, lang) {
    const isJa = lang === 'ja';
    const lines = [];
    const maxLines = Math.max(japaneseLines.length, romajiLines.length, englishLines.length);
    if (maxLines === 0) return '';

    for (let i = 0; i < maxLines; i++) {
        const jp = japaneseLines[i] || '';
        const rm = romajiLines[i] || '';
        const en = englishLines[i] || '';

        if (!jp && !rm && !en) { lines.push(''); continue; }

        if (isJa) {
            const katakana = rm ? romajiToKatakana(rm) : '';
            if (katakana && jp) {
                lines.push(`**${katakana}**`);
                lines.push(jp);
            } else {
                lines.push(jp || katakana);
            }
        } else {
            if (rm && en) {
                lines.push(`**${rm}**`);
                lines.push(en);
            } else if (jp && en) {
                lines.push(`**${jp}**`);
                lines.push(en);
            } else {
                lines.push(en || rm || jp);
            }
        }
        lines.push('');
    }

    return lines.join('\n').trim();
}

// ─── Wikipedia Lookup ─────────────────────────────────────────────────────────
async function fetchSummaryForQuery(query) {
    try {
        const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
        );
        if (!searchRes.ok) return null;

        const searchData = await searchRes.json();
        const firstResult = searchData.query?.search?.[0];
        if (!firstResult) return null;

        const summaryRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title.replace(/ /g, '_'))}`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
        );
        if (!summaryRes.ok) return null;

        const summaryData = await summaryRes.json();
        if (summaryData.type === 'disambiguation') return null;

        return {
            title: summaryData.title,
            summary: summaryData.extract,
            description: summaryData.description,
            url: summaryData.content_urls?.desktop?.page,
            thumbnail: summaryData.thumbnail?.source
        };
    } catch (err) {
        return null;
    }
}

async function fetchWikiInfo(title, artist) {
    let info = await fetchSummaryForQuery(`${title} ${artist} song`);
    if (info) { info.type = 'song'; return info; }

    info = await fetchSummaryForQuery(`${title} ${artist}`);
    if (info) { info.type = 'song'; return info; }

    if (artist && artist.toLowerCase() !== 'unknown') {
        info = await fetchSummaryForQuery(artist);
        if (info) { info.type = 'artist'; return info; }
    }

    return null;
}

// ─── Genius Auto-Search ───────────────────────────────────────────────────────
// Searches Genius for a song and returns metadata (title, artist, description, coverArt, url)
// Uses the public Genius search endpoint — no API key required
async function searchGenius(title, artist) {
    try {
        const query = artist ? `${title} ${artist}` : title;
        const searchUrl = `https://genius.com/api/search/song?q=${encodeURIComponent(query)}&per_page=5`;
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!res.ok) return null;

        const json = await res.json();
        const hits = json?.response?.sections?.[0]?.hits || [];
        if (hits.length === 0) return null;

        // Pick best hit — prefer one where title matches closely
        const lowerTitle = title.toLowerCase();
        let best = hits.find(h => h.result?.title?.toLowerCase().includes(lowerTitle)) || hits[0];
        const result = best.result;

        return {
            title: result.title || title,
            artist: result.primary_artist?.name || artist,
            coverArt: result.song_art_image_thumbnail_url || result.header_image_thumbnail_url || null,
            url: result.url || null,
            description: result.full_title || `${result.title} by ${result.primary_artist?.name}`,
            sourceName: 'Genius'
        };
    } catch (e) {
        console.error('[SongInfo] Genius search error:', e);
        return null;
    }
}

// ─── MusicBrainz Lookup ───────────────────────────────────────────────────────
// Provides structured metadata: release date, album, genre for any song
async function fetchMusicBrainz(title, artist) {
    try {
        const query = artist
            ? `recording:"${title}" AND artist:"${artist}"`
            : `recording:"${title}"`;
        const res = await fetch(
            `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&limit=1&fmt=json`,
            {
                headers: {
                    'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)',
                    'Accept': 'application/json'
                }
            }
        );
        if (!res.ok) return null;

        const json = await res.json();
        const rec = json.recordings?.[0];
        if (!rec) return null;

        const release = rec.releases?.[0];
        const genres = rec.genres?.map(g => g.name).slice(0, 3) || [];
        const tags = rec.tags?.sort((a, b) => b.count - a.count).map(t => t.name).slice(0, 3) || [];

        return {
            title: rec.title,
            artist: rec['artist-credit']?.[0]?.artist?.name || artist,
            album: release?.title || null,
            releaseDate: release?.date || null,
            genres: genres.length > 0 ? genres : tags,
            mbid: rec.id || null
        };
    } catch (e) {
        return null;
    }
}

// ─── Last.fm Lookup ───────────────────────────────────────────────────────────
// Provides playcount, listeners, tags/genre, wiki summary — no key needed for basic track.getInfo
async function fetchLastFm(title, artist) {
    try {
        // Use the public Last.fm API endpoint (no key required for basic read)
        const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=dde09d4eed0fb9ce95994f2fa9c1aad8&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&format=json&autocorrect=1`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' }
        });
        if (!res.ok) return null;

        const json = await res.json();
        if (json.error) return null;

        const track = json.track;
        if (!track) return null;

        const tags = track.toptags?.tag?.map(t => t.name).filter(t => t !== 'seen live').slice(0, 4) || [];
        const wiki = track.wiki?.summary
            ? track.wiki.summary.replace(/<[^>]*>/g, '').replace(/Read more on Last\.fm.*$/i, '').trim()
            : null;

        return {
            title: track.name,
            artist: track.artist?.name || artist,
            album: track.album?.title || null,
            playcount: track.playcount ? parseInt(track.playcount).toLocaleString() : null,
            listeners: track.listeners ? parseInt(track.listeners).toLocaleString() : null,
            tags,
            wiki,
            url: track.url || null
        };
    } catch (e) {
        return null;
    }
}

// ─── LRCLIB Lyrics Fetcher (for lyrics command, not used in songinfo display) ─
async function fetchLyrics(title, artist) {
    try {
        const res = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }
        );
        if (!res.ok) return null;

        const results = await res.json();
        const match = results?.find(r => r.plainLyrics);
        if (match) {
            return {
                albumName: match.albumName,
                trackName: match.trackName,
                artistName: match.artistName,
                duration: match.duration
            };
        }
        return null;
    } catch (err) {
        return null;
    }
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
        fetch(`https://${subdomain}.fandom.com/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(pageTitle)}&format=json&piprop=thumbnail&pithumbsize=500&origin=*`,
            { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } })
    ]);

    let description = '', coverArt = 'https://i.imgur.com/Mt8W5pJ.png';
    let trilingualData = null;

    if (parseRes.ok) {
        const parseJson = await parseRes.json();
        const html = parseJson.parse?.text?.['*'] || '';

        // Try trilingual table
        const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
        let jpLines = [], rmLines = [], enLines = [];

        for (const tbl of tables) {
            const rows = [...tbl[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
            if (rows.length < 5) continue;

            const tJp = [], tRm = [], tEn = [];
            for (const row of rows) {
                const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c =>
                    decodeHtml(c[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
                );
                if (cells.length >= 2 && (cells[0] || cells[1])) {
                    tJp.push(cells[0] || '');
                    tRm.push(cells[1] || '');
                    if (cells[2]) tEn.push(cells[2]);
                }
            }
            if (tJp.length >= 5) {
                jpLines = tJp; rmLines = tRm;
                if (tEn.length >= 5) enLines = tEn;
                break;
            }
        }

        if (jpLines.length > 0) {
            trilingualData = { japanese: jpLines, romaji: rmLines, english: enLines };
        }

        // Parse paragraphs for description
        const noiseWords = ['ranked on', 'Billboard', 'surpassed', 'views', 'uploaded', 'interpretation', 'music video', 'featured on', 'featured in'];
        const pMatches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
        const descParagraphs = [];

        for (const pm of pMatches) {
            const pText = decodeHtml(pm[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
            if (pText.length < 5) continue;
            const isNoise = noiseWords.some(n => pText.includes(n));
            if (!isNoise && descParagraphs.length < 4) {
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
        trilingual: trilingualData,
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
    const coverArt = getMeta('og:image') || 'https://i.imgur.com/Mt8W5pJ.png';
    const description = decodeHtml(getMeta('og:description') || '');

    let artist = 'Unknown Artist';
    if (cleanTitle.includes('–')) artist = cleanTitle.split('–')[0].trim();
    else if (cleanTitle.includes(' - ')) artist = cleanTitle.split(' - ')[0].trim();

    return {
        title: cleanTitle,
        artist,
        description,
        coverArt,
        url,
        sourceName: 'Genius',
        trilingual: null
    };
}

// ─── Module Export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('songinfo')
        .setDescription('Displays rich info, cover art, and links for any song.')
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
            if (isSlash) {
                return await context.editReply(payload);
            } else {
                if (loadingMsg) await loadingMsg.delete().catch(() => {});
                return await context.reply(payload);
            }
        };

        // ── Branch 1: Direct URL (Fandom / Genius) ─────────────────────────────
        if (query && (query.includes('fandom.com/wiki/') || query.includes('genius.com'))) {
            try {
                const parsed = query.includes('fandom.com/wiki/')
                    ? await parseFandomUrl(query)
                    : await parseGeniusUrl(query);

                if (!parsed) {
                    return await reply('❌ Could not load data from the provided link.');
                }

                const embed1 = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle(`🎵 ${parsed.title}`)
                    .setThumbnail(parsed.coverArt)
                    .setDescription(
                        `**Artist:** ${parsed.artist}\n` +
                        `**Source:** ${parsed.sourceName}\n\n` +
                        `**About:**\n${(parsed.description || '*No summary available.*').substring(0, 1500)}`
                    )
                    .setFooter({ text: `Use -lyrics <url> to see full lyrics` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('View Original Source')
                        .setStyle(ButtonStyle.Link)
                        .setURL(parsed.url)
                );

                return await reply({ embeds: [embed1], components: [buttons] });
            } catch (e) {
                console.error('[SongInfo] URL parse error:', e);
                return await reply('❌ An error occurred while fetching data from that link.');
            }
        }

        // ── Resolve title/artist/artwork from Lavalink ──────────────────────────
        let title = '', artist = '', coverArt = 'https://i.imgur.com/Mt8W5pJ.png';
        let durationMs = 0, trackUri = null;

        if (!query) {
            const player = client.activePlayers?.get(guildId);
            const currentTrack = player?.current;

            if (!currentTrack) {
                return await reply('❌ No music is currently playing. Please specify a song name or link.');
            }

            title = currentTrack.info.title;
            artist = currentTrack.info.author || 'Unknown';
            coverArt = currentTrack.info.artworkUrl || currentTrack.info.thumbnail || coverArt;
            trackUri = currentTrack.info.uri;
            durationMs = currentTrack.info.length || 0;
        } else {
            const resolveQuery = query.startsWith('http') ? query : `ytsearch:${query}`;
            try {
                const res = await client.riffy.resolve({ query: resolveQuery, requester: isSlash ? context.user : context.author });
                if (!res || !res.tracks || res.tracks.length === 0) {
                    return await reply('❌ Could not find that song. Try a more specific title or use a direct URL.');
                }

                const track = res.tracks[0];
                title = track.info.title;
                artist = track.info.author || 'Unknown';
                coverArt = track.info.artworkUrl || track.info.thumbnail || coverArt;
                trackUri = track.info.uri;
                durationMs = track.info.length || 0;
            } catch (err) {
                console.error('[SongInfo] Lavalink resolve failed:', err);
                title = query;
                artist = '';
            }
        }

        // Clean YouTube noise from title
        const cleanTitle = title
            .replace(/\((official|video|lyrics|audio|music|hd|4k|clip)\)/gi, '')
            .replace(/\[(official|video|lyrics|audio|music|hd|4k|clip)\]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Format duration
        const durationStr = durationMs > 0
            ? `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}`
            : 'Unknown';

        // ── Fetch all info sources concurrently ─────────────────────────────────
        const [wikiData, lyricsData, lastFmData, geniusData] = await Promise.all([
            fetchWikiInfo(cleanTitle, artist),
            fetchLyrics(cleanTitle, artist),
            fetchLastFm(cleanTitle, artist).catch(() => null),
            searchGenius(cleanTitle, artist).catch(() => null)
        ]);

        // Pick best cover art: track art > genius > wiki
        let displayCoverArt = coverArt;
        if (displayCoverArt === 'https://i.imgur.com/Mt8W5pJ.png') {
            displayCoverArt = geniusData?.coverArt || wikiData?.thumbnail || coverArt;
        }

        // ── Build description ────────────────────────────────────────────────────
        const displayArtist = artist || lyricsData?.artistName || lastFmData?.artist || 'Unknown';
        const displayAlbum = lyricsData?.albumName || lastFmData?.album || null;
        const genres = lastFmData?.tags?.length > 0 ? lastFmData.tags : null;

        let descLines = [];
        descLines.push(`**Artist:** ${displayArtist}`);
        descLines.push(`**Duration:** ${durationStr}`);
        if (displayAlbum) descLines.push(`**Album:** ${displayAlbum}`);
        if (genres) descLines.push(`**Genre:** ${genres.join(', ')}`);
        if (lastFmData?.listeners) descLines.push(`**Listeners:** ${lastFmData.listeners}`);
        if (lastFmData?.playcount) descLines.push(`**Plays:** ${lastFmData.playcount}`);

        // About section: prefer Last.fm wiki, then Wikipedia, then Genius description
        const aboutText = lastFmData?.wiki
            || (wikiData?.summary ? wikiData.summary.substring(0, 1200) : null)
            || (geniusData ? `*Found on Genius: **${geniusData.title}** by ${geniusData.artist}*` : null);

        if (aboutText) {
            descLines.push('');
            descLines.push(`**About:**`);
            descLines.push(aboutText.substring(0, 1200));
        }

        const description = descLines.join('\n');

        // ── Info Embed ──────────────────────────────────────────────────────────
        const embed1 = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`🎵 ${cleanTitle}`)
            .setThumbnail(displayCoverArt)
            .setDescription(description)
            .setFooter({ text: `Use \`-lyrics ${cleanTitle}\` to see lyrics` })
            .setTimestamp();

        // ── Link Buttons ────────────────────────────────────────────────────────
        const buttons = new ActionRowBuilder();
        if (trackUri) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('▶ Play Source')
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
        if (wikiData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('📖 Wikipedia')
                .setStyle(ButtonStyle.Link)
                .setURL(wikiData.url)
            );
        }
        if (lastFmData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('🎵 Last.fm')
                .setStyle(ButtonStyle.Link)
                .setURL(lastFmData.url)
            );
        }

        const payload = { embeds: [embed1] };
        if (buttons.components.length > 0) payload.components = [buttons];

        await reply(payload);
    }
};
