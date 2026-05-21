package com.example.backend.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Parses product size strings into structured dimensions.
 * Supports formats:
 *   - "160x80x75 cm"
 *   - "120cm x 60cm x 75cm"
 *   - "160 X 80 X 75"
 *   - "160x80x75"
 */
public final class DimensionParser {

    private static final Logger log = LoggerFactory.getLogger(DimensionParser.class);

    public static final int FALLBACK_LENGTH = 20;
    public static final int FALLBACK_WIDTH = 20;
    public static final int FALLBACK_HEIGHT = 20;
    public static final int FALLBACK_WEIGHT = 1000;

    private DimensionParser() {}

    public record Dimensions(int length, int width, int height) {}

    /**
     * Parse a size string like "160x80x75 cm" into Dimensions.
     * Returns fallback (20, 20, 20) if parsing fails.
     */
    public static Dimensions parse(String sizeString) {
        if (sizeString == null || sizeString.isBlank()) {
            return fallback();
        }

        try {
            // Remove 'cm', 'CM', extra whitespace
            String cleaned = sizeString
                    .replaceAll("(?i)cm", "")
                    .replaceAll("\\s+", "")
                    .trim();

            if (cleaned.isEmpty()) {
                return fallback();
            }

            // Split by 'x' or 'X'
            String[] parts = cleaned.split("[xX]");

            if (parts.length != 3) {
                log.warn("DimensionParser: expected 3 parts but got {} from '{}'", parts.length, sizeString);
                return fallback();
            }

            int length = Integer.parseInt(parts[0].trim());
            int width = Integer.parseInt(parts[1].trim());
            int height = Integer.parseInt(parts[2].trim());

            if (length <= 0 || width <= 0 || height <= 0) {
                log.warn("DimensionParser: non-positive dimension from '{}'", sizeString);
                return fallback();
            }

            return new Dimensions(length, width, height);
        } catch (NumberFormatException e) {
            log.warn("DimensionParser: failed to parse '{}': {}", sizeString, e.getMessage());
            return fallback();
        }
    }

    private static Dimensions fallback() {
        return new Dimensions(FALLBACK_LENGTH, FALLBACK_WIDTH, FALLBACK_HEIGHT);
    }
}
