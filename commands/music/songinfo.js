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
function formatLyrics(japaneseLines, romajiLines, englishLines, lang) {
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

// ─── LRCLIB Lyrics Fetcher ────────────────────────────────────────────────────
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
                lyrics: match.plainLyrics,
                albumName: match.albumName,
                trackName: match.trackName,
                artistName: match.artistName
            };
        }
        return null;
    } catch (err) {
        console.error('[SongInfo] LRCLIB error:', err);
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

    let description = '', lyrics = '', coverArt = 'https://i.imgur.com/Mt8W5pJ.png';
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

        // Paragraphs for description and fallback lyrics
        const noiseWords = ['ranked on', 'Billboard', 'surpassed', 'views', 'uploaded', 'interpretation', 'music video', 'featured on', 'featured in'];
        const pMatches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
        const descParagraphs = [], lyricParagraphs = [];

        for (const pm of pMatches) {
            const pText = decodeHtml(pm[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
            if (pText.length < 5) continue;
            const isNoise = noiseWords.some(n => pText.includes(n));
            if (!trilingualData && pText.length > 200 && !isNoise) {
                lyricParagraphs.push(pText);
            } else if (!isNoise && descParagraphs.length < 5) {
                descParagraphs.push(pText);
            }
        }

        description = descParagraphs.join('\n\n');
        if (!trilingualData) lyrics = lyricParagraphs.join('\n\n');
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
        lyrics: lyrics || null,
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

    const lyricsMatches = [...html.matchAll(/<div[^>]*class=["']Lyrics__Container[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];
    let lyrics = '';
    if (lyricsMatches.length > 0) {
        lyrics = decodeHtml(
            lyricsMatches.map(m => m[1]).join('\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .trim()
        );
    }

    let artist = 'Unknown Artist';
    if (cleanTitle.includes('–')) artist = cleanTitle.split('–')[0].trim();
    else if (cleanTitle.includes(' - ')) artist = cleanTitle.split(' - ')[0].trim();

    return { title: cleanTitle, artist, description, lyrics: lyrics || null, trilingual: null, coverArt, url, sourceName: 'Genius' };
}

// ─── Module Export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('songinfo')
        .setDescription('Displays info, lyrics, cover art, and links for a song.')
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
        const langMode = locale.startsWith('ja') ? 'ja' : 'en';

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

                // Info embed
                const embed1 = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle(`🎵 Song Info: ${parsed.title}`)
                    .setThumbnail(parsed.coverArt)
                    .setDescription(
                        `**Artist:** ${parsed.artist}\n` +
                        `**Source:** ${parsed.sourceName}\n\n` +
                        `**About:**\n${(parsed.description || '*No summary available.*').substring(0, 1500)}`
                    )
                    .setTimestamp();

                const embeds = [embed1];

                // Lyrics embed — prefer trilingual table
                if (parsed.trilingual) {
                    const { japanese, romaji, english } = parsed.trilingual;
                    const formattedText = formatLyrics(japanese, romaji, english, langMode);

                    if (formattedText) {
                        const langNote = langMode === 'ja'
                            ? 'Japanese + Katakana'
                            : 'Romaji + English Translation';

                        let lyricsPreview = formattedText;
                        if (lyricsPreview.length > 3500) {
                            lyricsPreview = lyricsPreview.substring(0, 3450) + '\n\n... *(use `-lyrics <url>` for full lyrics)*';
                        }

                        embeds.push(new EmbedBuilder()
                            .setColor(0x9b59b6)
                            .setTitle('🎤 Lyrics')
                            .setDescription(lyricsPreview)
                            .setFooter({ text: `${parsed.sourceName} • ${langNote}` })
                        );
                    }
                } else if (parsed.lyrics) {
                    let lyricsText = parsed.lyrics;
                    if (lyricsText.length > 3500) {
                        lyricsText = lyricsText.substring(0, 3450) + '\n\n... *(use `-lyrics <url>` for full lyrics)*';
                    }
                    embeds.push(new EmbedBuilder()
                        .setColor(0x9b59b6)
                        .setTitle('🎤 Lyrics')
                        .setDescription(lyricsText)
                        .setFooter({ text: `Lyrics provided by ${parsed.sourceName}` })
                    );
                }

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('View Original Source')
                        .setStyle(ButtonStyle.Link)
                        .setURL(parsed.url)
                );

                return await reply({ embeds, components: [buttons] });
            } catch (e) {
                console.error('[SongInfo] URL parse error:', e);
                return await reply('❌ An error occurred while fetching data from that link.');
            }
        }

        // ── Resolve title/artist/artwork from Lavalink ──────────────────────────
        let title = '', artist = '', coverArt = 'https://i.imgur.com/Mt8W5pJ.png';
        let durationStr = 'Unknown', trackUri = null;

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
            if (currentTrack.info.length) {
                durationStr = new Date(currentTrack.info.length).toISOString().substring(14, 19);
            }
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
                if (track.info.length) {
                    durationStr = new Date(track.info.length).toISOString().substring(14, 19);
                }
            } catch (err) {
                console.error('[SongInfo] Lavalink resolve failed:', err);
                title = query;
                artist = '';
            }
        }

        const cleanTitle = title
            .replace(/\((official|video|lyrics|audio|music|hd|4k|clip)\)/gi, '')
            .replace(/\[(official|video|lyrics|audio|music|hd|4k|clip)\]/gi, '')
            .trim();

        // Fetch Wikipedia + LRCLIB concurrently
        const [wikiData, lyricsData] = await Promise.all([
            fetchWikiInfo(cleanTitle, artist),
            fetchLyrics(cleanTitle, artist)
        ]);

        let displayCoverArt = coverArt;
        if (displayCoverArt === 'https://i.imgur.com/Mt8W5pJ.png' && wikiData?.thumbnail) {
            displayCoverArt = wikiData.thumbnail;
        }

        // ── Info Embed ──────────────────────────────────────────────────────────
        const embed1 = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`🎵 Song Info: ${cleanTitle}`)
            .setThumbnail(displayCoverArt)
            .setDescription(
                `**Artist:** ${artist || lyricsData?.artistName || 'Unknown'}\n` +
                `**Duration:** ${durationStr}\n` +
                (lyricsData?.albumName ? `**Album:** ${lyricsData.albumName}\n` : '') +
                (wikiData
                    ? `\n**About the ${wikiData.type === 'artist' ? 'Artist' : 'Song'}:**\n${wikiData.summary.substring(0, 1500)}`
                    : '\n*No Wikipedia summary found. Try using a Fandom or Genius link for more info.*')
            )
            .setTimestamp();

        const embeds = [embed1];

        // ── Lyrics Embed ────────────────────────────────────────────────────────
        if (lyricsData?.lyrics) {
            let lyricsText = lyricsData.lyrics;
            if (lyricsText.length > 3500) {
                lyricsText = lyricsText.substring(0, 3450) + '\n\n... *(use `-lyrics` for full lyrics)*';
            }
            embeds.push(new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🎤 Lyrics')
                .setDescription(lyricsText)
                .setFooter({ text: 'Lyrics provided by LRCLIB' })
            );
        }

        // ── Link Buttons ────────────────────────────────────────────────────────
        const buttons = new ActionRowBuilder();
        if (trackUri) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('▶ Play Source')
                .setStyle(ButtonStyle.Link)
                .setURL(trackUri)
            );
        }
        if (wikiData?.url) {
            buttons.addComponents(new ButtonBuilder()
                .setLabel('📖 Wikipedia Article')
                .setStyle(ButtonStyle.Link)
                .setURL(wikiData.url)
            );
        }

        const payload = { embeds };
        if (buttons.components.length > 0) payload.components = [buttons];

        await reply(payload);
    }
};
