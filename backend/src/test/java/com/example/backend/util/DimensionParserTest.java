package com.example.backend.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class DimensionParserTest {

    @Test
    void testParseValidFormats() {
        DimensionParser.Dimensions d1 = DimensionParser.parse("160x80x75 cm");
        assertEquals(160, d1.length());
        assertEquals(80, d1.width());
        assertEquals(75, d1.height());

        DimensionParser.Dimensions d2 = DimensionParser.parse("120cm x 60cm x 75cm");
        assertEquals(120, d2.length());
        assertEquals(60, d2.width());
        assertEquals(75, d2.height());

        DimensionParser.Dimensions d3 = DimensionParser.parse("160 X 80 X 75");
        assertEquals(160, d3.length());
        assertEquals(80, d3.width());
        assertEquals(75, d3.height());

        DimensionParser.Dimensions d4 = DimensionParser.parse("160x80x75");
        assertEquals(160, d4.length());
        assertEquals(80, d4.width());
        assertEquals(75, d4.height());

        DimensionParser.Dimensions d5 = DimensionParser.parse("160 X 80 X 75 CM");
        assertEquals(160, d5.length());
        assertEquals(80, d5.width());
        assertEquals(75, d5.height());
    }

    @Test
    void testParseInvalidFormats() {
        DimensionParser.Dimensions d1 = DimensionParser.parse(null);
        assertEquals(20, d1.length());
        assertEquals(20, d1.width());
        assertEquals(20, d1.height());

        DimensionParser.Dimensions d2 = DimensionParser.parse("");
        assertEquals(20, d2.length());
        assertEquals(20, d2.width());
        assertEquals(20, d2.height());

        DimensionParser.Dimensions d3 = DimensionParser.parse("invalid-data");
        assertEquals(20, d3.length());
        assertEquals(20, d3.width());
        assertEquals(20, d3.height());

        DimensionParser.Dimensions d4 = DimensionParser.parse("100x200");
        assertEquals(20, d4.length());
        assertEquals(20, d4.width());
        assertEquals(20, d4.height());

        DimensionParser.Dimensions d5 = DimensionParser.parse("abc x def x ghi");
        assertEquals(20, d5.length());
        assertEquals(20, d5.width());
        assertEquals(20, d5.height());
    }
}
