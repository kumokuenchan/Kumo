import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// Convert markdown text to HTML
export async function markdownToHtml(markdownText: string): Promise<string> {
  try {
    const file = await unified()
      .use(remarkParse)           // Parse markdown
      .use(remarkGfm)             // GitHub Flavored Markdown
      .use(remarkMath)            // Math support
      .process(markdownText);

    return String(file);
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback: return text as-is if conversion fails
    return `<p>${markdownText.replace(/\n/g, '<br>')}</p>`;
  }
}

// Helper function to convert markdown to HTML synchronously for immediate use
export function markdownToHtmlSync(markdownText: string): string {
  try {
    // For simple markdown conversion without async
    return markdownText
      // Convert headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Convert bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Convert code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Convert lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>')
      // Convert paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Add paragraph wrapper
      .replace(/^(?!<|<h|<ul|<li|<pre|<code)/gm, '<p>')
      .replace(/(?!>|\/li|\/ul|\/pre|\/code)$/gm, '</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      // Fix nested list issues
      .replace(/<\/ul>\s*<ul>/g, '')
      // Fix paragraph around headers
      .replace(/<p>(<h[1-6]>)/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      // Fix paragraph around lists
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1')
      // Fix paragraph around code blocks
      .replace(/<p>(<pre>)/g, '$1')
      .replace(/(<\/pre>)<\/p>/g, '$1');
  } catch (error) {
    console.error('Error in markdownToHtmlSync:', error);
    return `<p>${markdownText.replace(/\n/g, '<br>')}</p>`;
  }
}