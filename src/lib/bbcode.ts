/**
 * BB-Code <-> Markdown Bidirectional Lossless Converter
 * Vega Crimelife Community Forum
 */

export function bbcodeToMarkdown(text: string): string {
  if (!text) return '';

  let res = text;

  // Code blocks: [code=lang]...[/code] or [code]...[/code]
  res = res.replace(/\[code(?:=([a-zA-Z0-9_-]+))?\]([\s\S]*?)\[\/code\]/gi, (_, lang, content) => {
    const language = lang ? lang.trim() : '';
    return `\`\`\`${language}\n${content.trim()}\n\`\`\``;
  });

  // Quotes: [quote=Author]...[/quote] or [quote]...[/quote]
  res = res.replace(/\[quote(?:=([^\]]+))?\]([\s\S]*?)\[\/quote\]/gi, (_, author, content) => {
    const lines = content.trim().split('\n');
    const authorHeader = author ? `> **${author.trim()} schrieb:**\n` : '';
    return authorHeader + lines.map((l: string) => `> ${l}`).join('\n');
  });

  // Headings
  res = res.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, '# $1');
  res = res.replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, '## $1');
  res = res.replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, '### $1');

  // Basic styling
  res = res.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '**$1**');
  res = res.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '*$1*');
  res = res.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
  res = res.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '~~$1~~');

  // Images: [img]url[/img]
  res = res.replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '![$1]($1)');

  // URLs: [url=href]text[/url] or [url]href[/url]
  res = res.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '[$2]($1)');
  res = res.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '[$1]($1)');

  // Unordered lists: [list][*]item[*]item2[/list]
  res = res.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_, listContent) => {
    const items = listContent.split(/\[\*\]/gi).filter((s: string) => s.trim().length > 0);
    return '\n' + items.map((item: string) => `- ${item.trim()}`).join('\n') + '\n';
  });

  // Clean remaining color tags if any
  res = res.replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/gi, '$1');

  return res;
}

export function markdownToBBCode(text: string): string {
  if (!text) return '';

  let res = text;

  // Code blocks: ```lang ... ```
  res = res.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, content) => {
    return lang ? `[code=${lang.trim()}]${content.trim()}[/code]` : `[code]${content.trim()}[/code]`;
  });

  // Standalone images: ![alt](url)
  res = res.replace(/!\[(.*?)\]\((.*?)\)/g, '[img]$2[/img]');

  // Links: [text](url)
  res = res.replace(/\[(.*?)\]\((.*?)\)/g, '[url=$2]$1[/url]');

  // Headings
  res = res.replace(/^### (.*$)/gm, '[h3]$1[/h3]');
  res = res.replace(/^## (.*$)/gm, '[h2]$1[/h2]');
  res = res.replace(/^# (.*$)/gm, '[h1]$1[/h1]');

  // Blockquotes: > line
  res = res.replace(/((?:^>.*$\n?)+)/gm, (match) => {
    const content = match
      .split('\n')
      .map((l) => l.replace(/^>\s?/, ''))
      .join('\n')
      .trim();
    return `[quote]\n${content}\n[/quote]\n`;
  });

  // Formatting
  res = res.replace(/\*\*(.*?)\*\*/g, '[b]$1[/b]');
  res = res.replace(/\*(.*?)\*/g, '[i]$1[/i]');
  res = res.replace(/<u>(.*?)<\/u>/g, '[u]$1[/u]');
  res = res.replace(/~~(.*?)~~/g, '[s]$1[/s]');

  // Inline code `code`
  res = res.replace(/`([^`]+)`/g, '[code]$1[/code]');

  // Unordered lists: - item
  res = res.replace(/((?:^-\s+.*$\n?)+)/gm, (match) => {
    const items = match
      .split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => `[*]${l.replace(/^-\s+/, '').trim()}`)
      .join('\n');
    return `[list]\n${items}\n[/list]\n`;
  });

  return res;
}

export function hasBBCode(text: string): boolean {
  if (!text) return false;
  return /\[(b|i|u|s|quote|code|url|img|h1|h2|h3|list)\]/i.test(text);
}
