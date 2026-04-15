package com.arkstech.wikilive.service;

import com.arkstech.wikilive.dto.ExportDocumentRequest;
import com.arkstech.wikilive.dto.ImportDocumentResponse;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.docx4j.Docx4J;
import org.docx4j.XmlUtils;
import org.docx4j.convert.in.xhtml.XHTMLImporterImpl;
import org.docx4j.jaxb.Context;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.docx4j.wml.BooleanDefaultTrue;
import org.docx4j.wml.Body;
import org.docx4j.wml.ContentAccessor;
import org.docx4j.wml.CTTblLayoutType;
import org.docx4j.wml.ObjectFactory;
import org.docx4j.wml.P;
import org.docx4j.wml.PPr;
import org.docx4j.wml.PPrBase;
import org.docx4j.wml.SectPr;
import org.docx4j.wml.STPageOrientation;
import org.docx4j.wml.STTblLayoutType;
import org.docx4j.wml.Tbl;
import org.docx4j.wml.TblGrid;
import org.docx4j.wml.TblGridCol;
import org.docx4j.wml.TblPr;
import org.docx4j.wml.TblWidth;
import org.docx4j.wml.Tc;
import org.docx4j.wml.TcPr;
import org.docx4j.wml.Tr;
import org.docx4j.wml.TrPr;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Entities;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.xml.bind.JAXBElement;

@Service
public class DocumentConversionService {

    private static final MediaType DOCX_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private static final String EXPORT_CSS = """
            @page {
              size: A4 landscape;
              margin: 16mm 12mm 16mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              font-family: "UnicodeFallback", "Noto Sans", "DejaVu Sans", Arial, Helvetica, sans-serif;
              color: #111827;
              line-height: 1.5;
              font-size: 12px;
            }
            .document {
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 0;
            }
            .document-title {
              margin: 0 0 8px;
              font-size: 24px;
              line-height: 1.2;
            }
            .document-description {
              margin: 0 0 22px;
              color: #4b5563;
              font-size: 14px;
            }
            .content h1,
            .content h2,
            .content h3,
            .content h4,
            .content h5,
            .content h6 {
              margin: 22px 0 10px;
              line-height: 1.3;
            }
            .content p {
              margin: 0 0 12px;
            }
            .content ul,
            .content ol {
              margin: 0 0 14px 22px;
              padding: 0;
            }
            .content li {
              margin: 3px 0;
            }
            .content blockquote {
              margin: 16px 0;
              padding: 8px 12px;
              border-left: 4px solid #d1d5db;
              background: #f9fafb;
              color: #374151;
            }
            .content pre {
              margin: 14px 0;
              padding: 12px;
              border-radius: 8px;
              background: #f3f4f6;
              overflow: auto;
              white-space: pre-wrap;
              font-family: "UnicodeFallback", "DejaVu Sans Mono", Consolas, "Courier New", monospace;
              font-size: 11px;
              line-height: 1.35;
            }
            .content code {
              font-family: "UnicodeFallback", "DejaVu Sans Mono", Consolas, "Courier New", monospace;
              font-size: 11px;
            }
            .content pre code {
              font-family: inherit;
              font-size: inherit;
              line-height: inherit;
            }
            .content table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              table-layout: fixed;
              -fs-table-paginate: paginate;
            }
            .content thead {
              display: table-header-group;
            }
            .content tr {
              page-break-inside: avoid;
            }
            .content th,
            .content td {
              border: 1px solid #d1d5db;
              padding: 4px 5px;
              vertical-align: top;
              word-break: break-word;
              overflow-wrap: anywhere;
              white-space: normal;
              hyphens: auto;
              font-size: 10px;
              line-height: 1.25;
            }
            .content img {
              max-width: 100%;
              height: auto;
            }
            .content hr {
              border: 0;
              border-top: 1px solid #d1d5db;
              margin: 18px 0;
            }
            """;

    private static final Set<String> MARKDOWN_EXTENSIONS = Set.of("md", "markdown", "txt");
    private static final long MAX_IMPORT_FILE_SIZE_BYTES = 50L * 1024L * 1024L;

    public ExportedDocument exportDocument(ExportDocumentRequest request) {
        String format = normalizeFormat(request.format());
        String fileName = sanitizeFileName(request.title());
        String xhtml = buildExportHtml(request.title(), request.description(), request.html());

        return switch (format) {
            case "pdf" -> new ExportedDocument(
                    renderPdf(xhtml),
                    MediaType.APPLICATION_PDF,
                    fileName + ".pdf"
            );
            case "docx" -> new ExportedDocument(
                    renderDocx(xhtml),
                    DOCX_MEDIA_TYPE,
                    fileName + ".docx"
            );
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported export format");
        };
    }

    public ImportDocumentResponse importDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        if (file.getSize() > MAX_IMPORT_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is too large");
        }

        String originalFileName = file.getOriginalFilename() == null
                ? "imported-document"
                : file.getOriginalFilename();

        String format = detectImportFormat(originalFileName, file.getContentType());
        String rawText = switch (format) {
            case "markdown" -> readUtf8Text(file);
            case "docx" -> readDocxText(file);
            case "pdf" -> readPdfText(file);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported import format");
        };

        String markdown = "markdown".equals(format)
                ? normalizeMarkdownSource(rawText)
                : normalizeImportedText(rawText);
        if (markdown.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File does not contain importable text");
        }

        String importWarning = "pdf".equals(format)
                ? "PDF import preserves text only. Tables and layout may be lost."
                : null;

        return new ImportDocumentResponse(
                format,
                sanitizeTitleFromFileName(originalFileName),
                markdown,
                originalFileName,
                importWarning
        );
    }

    private String normalizeFormat(String format) {
        if (format == null || format.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "format is required");
        }
        return format.trim().toLowerCase(Locale.ROOT);
    }

    private String buildExportHtml(String title, String description, String editorHtml) {
        if (editorHtml == null || editorHtml.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "html is required");
        }

        Document doc = Document.createShell("");
        doc.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .escapeMode(Entities.EscapeMode.xhtml)
                .charset(StandardCharsets.UTF_8)
                .prettyPrint(true);

        doc.head().appendElement("meta").attr("charset", "UTF-8");
        doc.head().appendElement("style").appendText(EXPORT_CSS);

        Element article = doc.body().appendElement("article").addClass("document");
        article.appendElement("h1")
                .addClass("document-title")
                .text((title == null || title.isBlank()) ? "Document" : title.trim());

        if (description != null && !description.isBlank()) {
            article.appendElement("p")
                    .addClass("document-description")
                    .text(description.trim());
        }

        Element content = article.appendElement("section").addClass("content");
        String safeHtml = removeUnsafeHtml(editorHtml);
        content.append(safeHtml);

        return doc.outerHtml();
    }

    private String removeUnsafeHtml(String rawHtml) {
        Document contentDoc = Jsoup.parseBodyFragment(rawHtml);
        contentDoc.select("script, style, link[rel=stylesheet], iframe, object, embed").remove();
        return contentDoc.body().html();
    }

    private byte[] renderPdf(String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(html, null);
            for (File fontFile : resolveUnicodeFontCandidates()) {
                builder.useFont(fontFile, "UnicodeFallback");
            }
            builder.toStream(output);
            builder.useFastMode();
            builder.run();
            return output.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to render PDF", e);
        }
    }

    private List<File> resolveUnicodeFontCandidates() {
        List<String> candidates = List.of(
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/arialuni.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
        );

        List<File> available = new ArrayList<>();
        for (String path : candidates) {
            File file = new File(path);
            if (file.isFile() && file.canRead()) {
                available.add(file);
            }
        }
        return available;
    }

    private byte[] renderDocx(String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            WordprocessingMLPackage document = WordprocessingMLPackage.createPackage();
            applyWordSectionLayout(document);

            XHTMLImporterImpl importer = new XHTMLImporterImpl(document);
            document.getMainDocumentPart().getContent().addAll(importer.convert(html, null));
            postprocessWordTables(document);

            Docx4J.save(document, output);
            return output.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to render DOCX", e);
        }
    }

    private void applyWordSectionLayout(WordprocessingMLPackage document) {
        ObjectFactory factory = Context.getWmlObjectFactory();
        Body body = document.getMainDocumentPart().getJaxbElement().getBody();
        SectPr sectPr = body.getSectPr() != null ? body.getSectPr() : factory.createSectPr();

        SectPr.PgSz pgSz = sectPr.getPgSz() != null ? sectPr.getPgSz() : factory.createSectPrPgSz();
        pgSz.setOrient(STPageOrientation.LANDSCAPE);
        pgSz.setW(BigInteger.valueOf(16838)); // A4 landscape width in twips
        pgSz.setH(BigInteger.valueOf(11906)); // A4 landscape height in twips
        sectPr.setPgSz(pgSz);

        SectPr.PgMar pgMar = sectPr.getPgMar() != null ? sectPr.getPgMar() : factory.createSectPrPgMar();
        pgMar.setTop(BigInteger.valueOf(720));
        pgMar.setBottom(BigInteger.valueOf(720));
        pgMar.setLeft(BigInteger.valueOf(680));
        pgMar.setRight(BigInteger.valueOf(680));
        pgMar.setHeader(BigInteger.valueOf(450));
        pgMar.setFooter(BigInteger.valueOf(450));
        pgMar.setGutter(BigInteger.ZERO);
        sectPr.setPgMar(pgMar);

        body.setSectPr(sectPr);
    }

    private void postprocessWordTables(WordprocessingMLPackage document) {
        ObjectFactory factory = Context.getWmlObjectFactory();
        List<Object> tables = getAllElementFromObject(document.getMainDocumentPart(), Tbl.class);
        for (Object item : tables) {
            Tbl table = (Tbl) XmlUtils.unwrap(item);
            if (table == null) {
                continue;
            }
            if (table.getTblPr() == null) {
                table.setTblPr(factory.createTblPr());
            }

            TblPr properties = table.getTblPr();

            CTTblLayoutType layout = factory.createCTTblLayoutType();
            layout.setType(STTblLayoutType.FIXED);
            properties.setTblLayout(layout);

            TblWidth width = factory.createTblWidth();
            width.setType("pct");
            width.setW(BigInteger.valueOf(5000)); // 100%
            properties.setTblW(width);

            normalizeTableGridAndCellWidths(table, factory);
            normalizeRowsCellsParagraphs(table, factory);
        }
    }

    private void normalizeTableGridAndCellWidths(Tbl table, ObjectFactory factory) {
        List<Tr> rows = getTableRows(table);
        if (rows.isEmpty()) {
            return;
        }

        int maxCells = rows.stream()
                .mapToInt(row -> getCellsFromRow(row).size())
                .max()
                .orElse(0);
        if (maxCells <= 0) {
            return;
        }

        int printableWidthTwips = 16838 - 680 - 680;
        int cellWidthTwips = Math.max(800, printableWidthTwips / maxCells);

        TblGrid grid = table.getTblGrid() != null ? table.getTblGrid() : factory.createTblGrid();
        grid.getGridCol().clear();
        for (int i = 0; i < maxCells; i++) {
            TblGridCol col = factory.createTblGridCol();
            col.setW(BigInteger.valueOf(cellWidthTwips));
            grid.getGridCol().add(col);
        }
        table.setTblGrid(grid);

        for (Tr row : rows) {
            List<Tc> cells = getCellsFromRow(row);
            for (Tc cell : cells) {
                if (cell.getTcPr() == null) {
                    cell.setTcPr(factory.createTcPr());
                }
                TblWidth tcWidth = cell.getTcPr().getTcW() != null
                        ? cell.getTcPr().getTcW()
                        : factory.createTblWidth();
                tcWidth.setType("dxa");
                tcWidth.setW(BigInteger.valueOf(cellWidthTwips));
                cell.getTcPr().setTcW(tcWidth);
            }
        }
    }

    private void normalizeRowsCellsParagraphs(Tbl table, ObjectFactory factory) {
        for (Tr row : getTableRows(table)) {
            TrPr trPr = row.getTrPr() != null ? row.getTrPr() : factory.createTrPr();
            BooleanDefaultTrue cantSplit = new BooleanDefaultTrue();
            cantSplit.setVal(false);
            trPr.getCnfStyleOrDivIdOrGridBefore().add(factory.createCTTrPrBaseCantSplit(cantSplit));
            row.setTrPr(trPr);

            for (Tc cell : getCellsFromRow(row)) {
                TcPr tcPr = cell.getTcPr() != null ? cell.getTcPr() : factory.createTcPr();
                cell.setTcPr(tcPr);
                for (Object content : cell.getContent()) {
                    Object unwrapped = XmlUtils.unwrap(content);
                    if (unwrapped instanceof P paragraph) {
                        PPr pPr = paragraph.getPPr() != null ? paragraph.getPPr() : factory.createPPr();
                        PPrBase.Spacing spacing = pPr.getSpacing() != null ? pPr.getSpacing() : factory.createPPrBaseSpacing();
                        spacing.setAfter(BigInteger.ZERO);
                        spacing.setBefore(BigInteger.ZERO);
                        spacing.setLine(BigInteger.valueOf(240));
                        spacing.setLineRule(org.docx4j.wml.STLineSpacingRule.AUTO);
                        pPr.setSpacing(spacing);
                        paragraph.setPPr(pPr);
                    }
                }
            }
        }
    }

    private List<Tr> getTableRows(Tbl table) {
        List<Tr> rows = new ArrayList<>();
        for (Object content : table.getContent()) {
            Object unwrapped = XmlUtils.unwrap(content);
            if (unwrapped instanceof Tr row) {
                rows.add(row);
            }
        }
        return rows;
    }

    private List<Tc> getCellsFromRow(Tr row) {
        List<Tc> cells = new ArrayList<>();
        for (Object content : row.getContent()) {
            Object unwrapped = XmlUtils.unwrap(content);
            if (unwrapped instanceof Tc cell) {
                cells.add(cell);
            }
        }
        return cells;
    }

    private List<Object> getAllElementFromObject(Object obj, Class<?> toSearch) {
        List<Object> result = new ArrayList<>();
        if (obj == null) {
            return result;
        }
        Object unwrapped = XmlUtils.unwrap(obj);
        if (toSearch.isInstance(unwrapped)) {
            result.add(unwrapped);
        }
        if (unwrapped instanceof ContentAccessor accessor) {
            for (Object child : accessor.getContent()) {
                result.addAll(getAllElementFromObject(child, toSearch));
            }
        } else if (unwrapped instanceof JAXBElement<?> element) {
            result.addAll(getAllElementFromObject(element.getValue(), toSearch));
        }
        return result;
    }

    private String readUtf8Text(MultipartFile file) {
        try {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read text file", e);
        }
    }

    private String readDocxText(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document = new XWPFDocument(inputStream)) {
            StringBuilder markdown = new StringBuilder();
            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) {
                    String paragraphMarkdown = paragraphToMarkdown(paragraph);
                    if (!paragraphMarkdown.isBlank()) {
                        if (markdown.length() > 0) {
                            markdown.append("\n\n");
                        }
                        markdown.append(paragraphMarkdown);
                    }
                    continue;
                }
                if (element instanceof XWPFTable table) {
                    String tableMarkdown = tableToMarkdown(table);
                    if (!tableMarkdown.isBlank()) {
                        if (markdown.length() > 0) {
                            markdown.append("\n\n");
                        }
                        markdown.append(tableMarkdown);
                    }
                }
            }
            return markdown.toString();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read DOCX file", e);
        }
    }

    private String paragraphToMarkdown(XWPFParagraph paragraph) {
        List<XWPFRun> runs = paragraph.getRuns();
        if (runs == null || runs.isEmpty()) {
            return "";
        }
        StringBuilder line = new StringBuilder();
        for (XWPFRun run : runs) {
            String text = run.text();
            if (text == null || text.isBlank()) {
                continue;
            }
            String normalized = text.replace('\u00A0', ' ').trim();
            if (normalized.isBlank()) {
                continue;
            }
            String decorated = normalized;
            if (run.isBold()) {
                decorated = "**" + decorated + "**";
            }
            if (run.isItalic()) {
                decorated = "_" + decorated + "_";
            }
            if (!line.isEmpty()) {
                line.append(' ');
            }
            line.append(decorated);
        }
        return line.toString().trim();
    }

    private String tableToMarkdown(XWPFTable table) {
        List<XWPFTableRow> rows = table.getRows();
        if (rows == null || rows.isEmpty()) {
            return "";
        }
        int maxColumns = rows.stream()
                .map(XWPFTableRow::getTableCells)
                .filter(cells -> cells != null)
                .mapToInt(List::size)
                .max()
                .orElse(0);
        if (maxColumns == 0) {
            return "";
        }

        List<List<String>> normalizedRows = new ArrayList<>();
        for (XWPFTableRow row : rows) {
            List<XWPFTableCell> cells = row.getTableCells();
            List<String> normalized = new ArrayList<>(maxColumns);
            for (int i = 0; i < maxColumns; i++) {
                String text = (cells != null && i < cells.size()) ? normalizeTableCell(cells.get(i)) : "";
                normalized.add(text);
            }
            normalizedRows.add(normalized);
        }

        List<String> lines = new ArrayList<>();
        List<String> header = normalizedRows.get(0);
        lines.add(toMarkdownRow(header));
        lines.add(toMarkdownRow(header.stream().map(_ignored -> "---").collect(Collectors.toList())));
        for (int i = 1; i < normalizedRows.size(); i++) {
            lines.add(toMarkdownRow(normalizedRows.get(i)));
        }
        return String.join("\n", lines);
    }

    private String normalizeTableCell(XWPFTableCell cell) {
        if (cell == null) {
            return "";
        }
        return escapeMarkdownCell(cell.getText()
                .replace("\r\n", " ")
                .replace('\r', ' ')
                .replace('\n', ' ')
                .trim());
    }

    private String toMarkdownRow(List<String> cells) {
        return "| " + String.join(" | ", cells) + " |";
    }

    private String escapeMarkdownCell(String value) {
        return value.replace("\\", "\\\\").replace("|", "\\|");
    }

    private String readPdfText(MultipartFile file) {
        try {
            try (InputStream inputStream = file.getInputStream();
                 PDDocument document = PDDocument.load(inputStream)) {
                PDFTextStripper stripper = new PDFTextStripper();
                return stripper.getText(document);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read PDF file", e);
        }
    }

    private String detectImportFormat(String fileName, String contentType) {
        String extension = getFileExtension(fileName);
        if (MARKDOWN_EXTENSIONS.contains(extension)) {
            return "markdown";
        }
        if ("docx".equals(extension)) {
            return "docx";
        }
        if ("pdf".equals(extension)) {
            return "pdf";
        }

        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (normalizedContentType.contains("pdf")) {
            return "pdf";
        }
        if (normalizedContentType.contains("wordprocessingml")) {
            return "docx";
        }
        if (normalizedContentType.contains("markdown") || normalizedContentType.startsWith("text/")) {
            return "markdown";
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file format");
    }

    private String getFileExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx + 1 >= fileName.length()) {
            return "";
        }
        return fileName.substring(idx + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeImportedText(String value) {
        String normalized = value == null ? "" : value
                .replace("\uFEFF", "")
                .replace("\r\n", "\n")
                .replace('\r', '\n');

        String[] lines = normalized.split("\n", -1);
        StringBuilder result = new StringBuilder(normalized.length());
        boolean previousBlank = false;

        for (String line : lines) {
            String trimmedLine = stripTrailingWhitespace(line);
            boolean blank = trimmedLine.isBlank();
            if (blank) {
                if (!previousBlank && result.length() > 0) {
                    result.append('\n');
                }
                previousBlank = true;
                continue;
            }

            if (result.length() > 0) {
                result.append('\n');
            }
            result.append(trimmedLine);
            previousBlank = false;
        }

        return result.toString().trim();
    }

    private String normalizeMarkdownSource(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\uFEFF", "")
                .replace("\r\n", "\n")
                .replace('\r', '\n');
    }

    private String stripTrailingWhitespace(String value) {
        int end = value.length();
        while (end > 0 && Character.isWhitespace(value.charAt(end - 1))) {
            end--;
        }
        return value.substring(0, end);
    }

    private String sanitizeTitleFromFileName(String fileName) {
        String withoutExtension = fileName;
        int idx = fileName.lastIndexOf('.');
        if (idx > 0) {
            withoutExtension = fileName.substring(0, idx);
        }

        String compact = withoutExtension.trim().replaceAll("\\s+", " ");
        if (compact.isBlank()) {
            return "Imported document";
        }
        return compact.length() <= 120 ? compact : compact.substring(0, 120).trim();
    }

    private String sanitizeFileName(String fileName) {
        String source = (fileName == null || fileName.isBlank()) ? "document" : fileName.trim();
        String normalized = source
                .replaceAll("[\\\\/:*?\"<>|]", "-")
                .replaceAll("\\s+", " ")
                .replaceAll("^\\.+", "")
                .replaceAll("\\.+$", "");

        if (normalized.isBlank()) {
            return "document";
        }
        return normalized.length() <= 120 ? normalized : normalized.substring(0, 120).trim();
    }

    public record ExportedDocument(
            byte[] content,
            MediaType contentType,
            String fileName
    ) {
    }
}
