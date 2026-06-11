const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── Romaji → Katakana Converter ─────────────────────────────────────────────
function romajiToKatakana(romaji) {
    const mapping = {
        'sha': 'シャ', 'shu': 'シュ', 'sho': 'ショ',
        'cha': 'チャ', 'chu': 'チュ', 'cho': 'チョ',
        'ja': 'ジャ', 'ju': 'ジュ', 'jo': 'ジョ',
        'tsu': 'ツ', 'chi': 'チ', 'shi': 'シ',
        'kya': 'キャ', 'kyu': 'キュ', 'kyo': 'キョ',
        'sya': 'シャ', 'syu': 'シュ', 'syo': 'ショ',
        'cya': 'チャ', 'cyu': 'チュ', 'cyo': 'チョ',
        'zya': 'ジャ', 'zyu': 'ジュ', 'zyo': 'ジョ',
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
    // Handle double-consonant sokuon (ッ)
    result = result.replace(/cch/g, 'ッch').replace(/tch/g, 'ッch');
    result = result.replace(/([kstp])\1/g, 'ッ$1');

    const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const regex = new RegExp(key, 'g');
        result = result.replace(regex, mapping[key]);
    }
    return result;
}

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

// ─── Trilingual Lyric Formatter ───────────────────────────────────────────────
// lang = 'ja' → show Japanese + Katakana (from Romaji)
// lang = anything else → show Romaji + English translation
function formatLyrics(japaneseLines, romajiLines, englishLines, lang) {
    const isJa = lang === 'ja';
    const lines = [];
    const maxLines = Math.max(japaneseLines.length, romajiLines.length, englishLines.length);
    if (maxLines === 0) return '';

    for (let i = 0; i < maxLines; i++) {
        const jp = japaneseLines[i] || '';
        const rm = romajiLines[i] || '';
        const en = englishLines[i] || '';

        if (!jp && !rm && !en) {
            lines.push('');
            continue;
        }

        if (isJa) {
            // Japanese locale: Katakana (transliterated from romaji) + JP original
            const katakana = rm ? romajiToKatakana(rm) : '';
            if (katakana && jp) {
                lines.push(`**${katakana}**`);
                lines.push(jp);
            } else {
                lines.push(jp || katakana);
            }
        } else {
            // English/default locale: Romaji bold + English translation
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

// ─── Fandom Wiki Parser ───────────────────────────────────────────────────────
// Returns { title, artist, description, lyrics, trilingual, coverArt, url, sourceName }
// trilingual = { japanese, romaji, english } arrays (if trilingual table found)
async function parseFandomUrl(url) {
    const fandomRegex = /https?:\/\/([^.]+)\.fandom\.com\/wiki\/(.+)/i;
    const m = url.match(fandomRegex);
    if (!m) return null;

    const subdomain = m[1];
    const pageTitle = decodeURIComponent(m[2]);

    const parseUrl = `https://${subdomain}.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
    const imageUrl = `https://${subdomain}.fandom.com/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(pageTitle)}&format=json&piprop=thumbnail&pithumbsize=500&origin=*`;

    const [parseRes, imageRes] = await Promise.all([
        fetch(parseUrl, { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } }),
        fetch(imageUrl, { headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' } })
    ]);

    let description = '';
    let lyrics = '';
    let coverArt = 'https://i.imgur.com/Mt8W5pJ.png';
    let trilingualData = null;

    if (parseRes.ok) {
        const parseJson = await parseRes.json();
        const html = parseJson.parse?.text?.['*'] || '';

        // ── Step 1: Try to parse a trilingual table (JP / Romaji / EN columns) ──
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        const tables = [...html.matchAll(tableRegex)];
        let japaneseLines = [];
        let romajiLines = [];
        let englishLines = [];

        for (const tableMatch of tables) {
            const tableHtml = tableMatch[1];
            const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            const rows = [...tableHtml.matchAll(trRegex)];
            if (rows.length < 5) continue;

            const tempJp = [], tempRm = [], tempEn = [];

            for (const rowMatch of rows) {
                const rowHtml = rowMatch[1];
                const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                const cells = [...rowHtml.matchAll(tdRegex)].map(c =>
                    decodeHtml(c[1]
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]*>/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                    )
                );

                if (cells.length >= 2) {
                    if (cells[0] || cells[1]) {
                        tempJp.push(cells[0] || '');
                        tempRm.push(cells[1] || '');
                        if (cells.length >= 3) tempEn.push(cells[2] || '');
                    }
                }
            }

            // Only use table if it looks like a real lyric table
            if (tempJp.length >= 5) {
                japaneseLines = tempJp;
                romajiLines = tempRm;
                if (tempEn.length >= 5) englishLines = tempEn;
                break;
            }
        }

        if (japaneseLines.length > 0) {
            trilingualData = { japanese: japaneseLines, romaji: romajiLines, english: englishLines };
        }

        // ── Step 2: Parse <p> paragraphs for description and fallback lyrics ──
        const pRegex = /<p>([\s\S]*?)<\/p>/gi;
        const paragraphs = [];
        let pm;
        while ((pm = pRegex.exec(html)) !== null) {
            const pText = pm[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (pText.length > 5) paragraphs.push(pText);
        }

        const descParagraphs = [];
        const lyricParagraphs = [];
        const noisePatterns = ['ranked on', 'Billboard', 'surpassed', 'views', 'uploaded', 'interpretation', 'music video', 'featured on', 'featured in'];

        for (const p of paragraphs) {
            const cleanP = decodeHtml(p);
            const isNoise = noisePatterns.some(n => cleanP.includes(n));

            if (!trilingualData && cleanP.length > 200 && !isNoise) {
                lyricParagraphs.push(cleanP);
            } else if (!isNoise && descParagraphs.length < 5) {
                descParagraphs.push(cleanP);
            }
        }

        description = descParagraphs.join('\n\n');
        if (!trilingualData) {
            lyrics = lyricParagraphs.join('\n\n');
        }
    }

    if (imageRes.ok) {
        const imgJson = await imageRes.json();
        const pages = imgJson.query?.pages || {};
        const page = Object.values(pages)[0];
        if (page?.thumbnail?.source) coverArt = page.thumbnail.source;
    }

    const cleanTitle = pageTitle.replace(/_/g, ' ');

    return {
        title: cleanTitle,
        artist: subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Wiki',
        description: description || 'No summary available.',
        lyrics: lyrics || null,
        trilingual: trilingualData,
        coverArt,
        url,
        sourceName: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Fandom Wiki`
    };
}

// ─── Genius Parser ────────────────────────────────────────────────────────────
async function parseGeniusUrl(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!res.ok) return null;
    const html = await res.text();

    const getMeta = (property) => {
        const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i');
        const m = html.match(regex);
        if (m) {
            const cm = m[0].match(/content=["'](.*?)["']/i);
            if (cm) return cm[1];
        }
        return null;
    };

    const rawTitle = getMeta('og:title') || 'Genius Song';
    const cleanTitle = decodeHtml(rawTitle.replace(/\s*\|\s*Genius\s*Lyrics/gi, ''));
    const description = decodeHtml(getMeta('og:description') || 'Genius Lyrics Page');
    const coverArt = getMeta('og:image') || 'https://i.imgur.com/Mt8W5pJ.png';

    // Extract lyrics from Lyrics__Container divs
    const lyricsContainerRegex = /<div[^>]*class=["']Lyrics__Container[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    const matches = [...html.matchAll(lyricsContainerRegex)];
    let lyrics = '';
    if (matches.length > 0) {
        let lyricsHtml = matches.map(m2 => m2[1]).join('\n');
        lyrics = lyricsHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .trim();
        lyrics = decodeHtml(lyrics);
    }

    let artist = 'Unknown Artist';
    if (cleanTitle.includes('–')) artist = cleanTitle.split('–')[0].trim();
    else if (cleanTitle.includes(' - ')) artist = cleanTitle.split(' - ')[0].trim();

    return {
        title: cleanTitle,
        artist,
        description,
        lyrics: lyrics || null,
        trilingual: null,
        coverArt,
        url,
        sourceName: 'Genius'
    };
}

// ─── LRCLIB Lyrics Fetcher ────────────────────────────────────────────────────
async function fetchLyrics(title, artist) {
    try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}`;
        const res = await fetch(searchUrl, {
            headers: { 'User-Agent': 'NishankaBot/1.0.0 (https://nishanka.zeyuki.app)' }
        });
        if (!res.ok) return null;

        const results = await res.json();
        if (results && results.length > 0) {
            const match = results.find(r => r.plainLyrics);
            if (match) {
                return {
                    lyrics: match.plainLyrics,
                    syncedLyrics: match.syncedLyrics,
                    albumName: match.albumName,
                    trackName: match.trackName,
                    artistName: match.artistName
                };
            }
        }
        return null;
    } catch (err) {
        console.error('[Lyrics] LRCLIB fetch error:', err);
        return null;
    }
}

// ─── Split long text into embed-safe pages ────────────────────────────────────
function paginateLyrics(title, artistName, coverArt, lyricsText, footerText) {
    const maxLen = 3900;
    const embeds = [];

    if (lyricsText.length <= maxLen) {
        const embed = new EmbedBuilder()
            .setColor(0x7c6cf0)
            .setTitle(`🎤 Lyrics: ${title}`)
            .setAuthor({ name: artistName })
            .setDescription(lyricsText)
            .setFooter({ text: footerText });
        if (coverArt) embed.setThumbnail(coverArt);
        embeds.push(embed);
    } else {
        const lines = lyricsText.split('\n');
        let currentChunk = '';
        let pageNum = 1;

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLen) {
                const embed = new EmbedBuilder()
                    .setColor(0x7c6cf0)
                    .setTitle(`🎤 Lyrics: ${title} (Part ${pageNum})`)
                    .setAuthor({ name: artistName })
                    .setDescription(currentChunk)
                    .setFooter({ text: footerText });
                if (pageNum === 1 && coverArt) embed.setThumbnail(coverArt);
                embeds.push(embed);
                currentChunk = line + '\n';
                pageNum++;
            } else {
                currentChunk += line + '\n';
            }
        }

        if (currentChunk.trim().length > 0) {
            const embed = new EmbedBuilder()
                .setColor(0x7c6cf0)
                .setTitle(`🎤 Lyrics: ${title} (Part ${pageNum})`)
                .setAuthor({ name: artistName })
                .setDescription(currentChunk)
                .setFooter({ text: footerText });
            embeds.push(embed);
        }
    }

    return embeds.slice(0, 5);
}

// ─── Module Export ────────────────────────────────────────────────────────────
module.exports = {
    category: 'music',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Fetches the lyrics for the currently playing song or a specified song.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL (optional if music is playing in voice channel)')
                .setRequired(false)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        // Discord interaction locale (e.g. 'ja', 'en-US', 'ko')
        const locale = interaction.locale || 'en-US';
        await this.handleLyrics(interaction, interaction.client, interaction.guild.id, query, true, locale);
    },

    async executePrefix(message, args) {
        const query = args.length > 0 ? args.join(' ') : null;
        // For prefix commands there's no Discord locale; default to 'en-US'
        const locale = message.guild?.preferredLocale || 'en-US';
        await this.handleLyrics(message, message.client, message.guild.id, query, false, locale);
    },

    async handleLyrics(context, client, guildId, query, isSlash, locale = 'en-US') {
        // Determine language mode from Discord locale
        // 'ja' → Japanese mode (Katakana), anything else → English mode (Romaji + EN translation)
        const langMode = locale.startsWith('ja') ? 'ja' : 'en';

        if (isSlash) {
            await context.deferReply();
        } else {
            var loadingMsg = await context.reply('🔍 *Searching for lyrics, please wait...*');
        }

        const reply = async (payload) => {
            if (isSlash) {
                return await context.editReply(payload);
            } else {
                if (loadingMsg) await loadingMsg.delete().catch(() => {});
                return await context.reply(payload);
            }
        };

        // ── Branch 1: URL provided (Fandom or Genius) ─────────────────────────
        if (query && (query.includes('fandom.com/wiki/') || query.includes('genius.com'))) {
            try {
                let parsed = null;
                if (query.includes('fandom.com/wiki/')) {
                    parsed = await parseFandomUrl(query);
                } else {
                    parsed = await parseGeniusUrl(query);
                }

                if (!parsed) {
                    return await reply('❌ Could not load data from the provided link.');
                }

                // If Fandom gave us a trilingual table, use the formatter
                if (parsed.trilingual) {
                    const { japanese, romaji, english } = parsed.trilingual;
                    const formattedText = formatLyrics(japanese, romaji, english, langMode);

                    if (!formattedText) {
                        return await reply(`❌ No lyrics found on that page.`);
                    }

                    const langNote = langMode === 'ja'
                        ? 'Japanese + Katakana'
                        : 'Romaji + English Translation';
                    const footerText = `Lyrics from ${parsed.sourceName} • ${langNote}`;

                    const embeds = paginateLyrics(parsed.title, parsed.artist, parsed.coverArt, formattedText, footerText);
                    return await reply({ embeds });
                }

                // Otherwise use the plain lyrics (Genius or Fandom paragraph mode)
                const lyricsText = parsed.lyrics;
                if (!lyricsText) {
                    return await reply('❌ Could not extract lyrics from the provided link.');
                }

                const embeds = paginateLyrics(parsed.title, parsed.artist, parsed.coverArt, lyricsText, `Lyrics provided by ${parsed.sourceName}`);
                return await reply({ embeds });

            } catch (e) {
                console.error('[Lyrics] URL parse error:', e);
                return await reply('❌ An error occurred while fetching lyrics from the link.');
            }
        }

        // ── Branch 2: No query — use currently playing track ─────────────────
        let title = '';
        let artist = '';
        let coverArt = null;

        if (!query) {
            const player = client.activePlayers?.get(guildId);
            const currentTrack = player?.current;

            if (!currentTrack) {
                return await reply('❌ No music is currently playing. Please specify a song name or link.');
            }

            title = currentTrack.info.title;
            artist = currentTrack.info.author || 'Unknown';
            coverArt = currentTrack.info.artworkUrl || currentTrack.info.thumbnail;
        } else {
            // ── Branch 3: Song name query — resolve via Lavalink ─────────────
            const resolveQuery = query.startsWith('http') ? query : `ytsearch:${query}`;

            try {
                const res = await client.riffy.resolve({ query: resolveQuery, requester: isSlash ? context.user : context.author });
                if (!res || !res.tracks || res.tracks.length === 0) {
                    return await reply('❌ Could not find that song. Try a more specific title or artist name.');
                }

                const track = res.tracks[0];
                title = track.info.title;
                artist = track.info.author || 'Unknown';
                coverArt = track.info.artworkUrl || track.info.thumbnail;
            } catch (err) {
                console.error('[Lyrics] Lavalink resolve failed:', err);
                title = query;
                artist = '';
            }
        }

        // Clean YouTube noise from title
        const cleanTitle = title
            .replace(/\((official|video|lyrics|audio|music|hd|4k|clip)\)/gi, '')
            .replace(/\[(official|video|lyrics|audio|music|hd|4k|clip)\]/gi, '')
            .trim();

        // Fetch from LRCLIB
        const lyricsData = await fetchLyrics(cleanTitle, artist);
        if (!lyricsData || !lyricsData.lyrics) {
            return await reply(`❌ Could not find lyrics for **${cleanTitle}**${artist ? ` by *${artist}*` : ''}.\n\nTip: Try using a Fandom or Genius link: \`-lyrics <url>\``);
        }

        const embeds = paginateLyrics(
            lyricsData.trackName || cleanTitle,
            lyricsData.artistName || artist,
            coverArt,
            lyricsData.lyrics,
            'Lyrics provided by LRCLIB'
        );

        await reply({ embeds });
    }
};
