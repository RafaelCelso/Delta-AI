declare module "officeparser" {
  interface OfficeParserConfig {
    newlineDelimiter?: string;
    ignoreNotes?: boolean;
    putNotesAtLast?: boolean;
    outputEncoding?: string;
  }

  function parseOfficeAsync(
    buffer: Buffer | string,
    config?: OfficeParserConfig,
  ): Promise<string>;

  export { parseOfficeAsync, OfficeParserConfig };
}
