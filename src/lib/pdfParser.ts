/**
 * Modern PDF Parser Utility using pdf2json
 *
 * A reliable utility function to extract text content from PDF files
 * Based on https://www.npmjs.com/package/pdf2json
 */

// Type definitions
interface PDFOptions {
  includePageNumbers?: boolean;
  pageBreakSeparator?: string;
  preserveLayout?: boolean;
  preserveWhitespace?: boolean;
  maxPages?: number | null;
}

interface PDFTextRun {
  T: string;
}

interface PDFText {
  x: number;
  y: number;
  R: PDFTextRun[];
}

interface PDFPage {
  Texts: PDFText[];
}

interface PDFData {
  Pages: PDFPage[];
  Meta?: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    Version?: string;
  };
}

interface PDFError {
  parserError: Error;
}

type PDFSource = Buffer | string;

/**
 * Parses PDF content and extracts text
 *
 * @param {Buffer|string} pdfSource - PDF data as Buffer or file path
 * @param {Object} options - Parsing options
 * @param {boolean} options.includePageNumbers - Include page numbers in output (default: true)
 * @param {string} options.pageBreakSeparator - Separator between pages (default: '\n\n')
 * @param {boolean} options.preserveLayout - Preserve text layout and positioning (default: false)
 * @param {number} options.maxPages - Maximum number of pages to parse (default: null)
 * @returns {Promise<string>} - Extracted text content
 */
export async function parsePDFContent(
  pdfSource: PDFSource,
  options: PDFOptions = {}
): Promise<string> {
  const {
    includePageNumbers = false,
    pageBreakSeparator = "\n",
    preserveLayout = false,
    preserveWhitespace = false,
    maxPages = null,
  } = options;

  try {
    // Dynamic import to avoid Next.js issues
    const PDFParser = (await import("pdf2json")).default;

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true); // Enable readable stream

      let extractedText = "";
      let currentPage = 0;

      // Error handler
      pdfParser.on("pdfParser_dataError", (errData: PDFError) => {
        reject(new Error(`PDF parsing error: ${errData.parserError.message}`));
      });

      // Success handler
      pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
        try {
          if (!pdfData || !pdfData.Pages) {
            reject(new Error("Invalid PDF data structure"));
            return;
          }

          const pages = maxPages
            ? pdfData.Pages.slice(0, maxPages)
            : pdfData.Pages;

          pages.forEach((page, pageIndex) => {
            currentPage = pageIndex + 1;

            if (!page.Texts || page.Texts.length === 0) {
              return; // Skip empty pages
            }

            let pageText = "";

            if (preserveLayout) {
              // Preserve layout by sorting texts by position
              const sortedTexts = page.Texts.sort((a, b) => {
                // Sort by Y position (top to bottom), then X position (left to right)
                if (Math.abs(a.y - b.y) < 0.1) {
                  return a.x - b.x;
                }
                return a.y - b.y;
              });

              let lastY = -1;
              sortedTexts.forEach((text) => {
                if (text.R && text.R.length > 0) {
                  // Add line break if significant Y position change
                  if (lastY !== -1 && Math.abs(text.y - lastY) > 0.5) {
                    pageText += "\n";
                  }

                  text.R.forEach((textRun) => {
                    if (textRun.T) {
                      pageText += decodeURIComponent(textRun.T);
                    }
                  });

                  pageText += " ";
                  lastY = text.y;
                }
              });
            } else {
              // Simple text extraction without layout preservation
              page.Texts.forEach((text) => {
                if (text.R && text.R.length > 0) {
                  text.R.forEach((textRun) => {
                    if (textRun.T) {
                      pageText += decodeURIComponent(textRun.T) + " ";
                    }
                  });
                }
              });
            }

            // Clean up the page text based on preserveWhitespace option
            if (!preserveWhitespace) {
              pageText = pageText.trim().replace(/\s+/g, " ");
            } else {
              pageText = pageText.trim();
            }

            if (pageText) {
              if (includePageNumbers) {
                extractedText += `--- Page ${currentPage} ---\n${pageText}${pageBreakSeparator}`;
              } else {
                extractedText += pageText + pageBreakSeparator;
              }
            }
          });

          resolve(extractedText.trim());
        } catch (processingError: unknown) {
          const errorMessage =
            processingError instanceof Error
              ? processingError.message
              : "Unknown processing error";
          reject(new Error(`Text processing error: ${errorMessage}`));
        }
      });

      // Parse the PDF
      if (Buffer.isBuffer(pdfSource)) {
        pdfParser.parseBuffer(pdfSource);
      } else if (typeof pdfSource === "string") {
        // Assume it's a file path
        pdfParser.loadPDF(pdfSource);
      } else {
        reject(new Error("Invalid PDF source. Expected Buffer or file path."));
      }
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`PDF parser initialization failed: ${errorMessage}`);
  }
}
