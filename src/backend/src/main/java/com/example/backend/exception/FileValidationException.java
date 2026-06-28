package com.example.backend.exception;

/**
 * Exception thrown when uploaded file fails validation
 * (empty file, unsupported format, etc.).
 */
public class FileValidationException extends RuntimeException {

    public FileValidationException(String message) {
        super(message);
    }
}
