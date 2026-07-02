declare module 'pdf-parse-fixed' {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: { max?: number }
  ): Promise<PDFParseResult>;

  export default pdfParse;
}
