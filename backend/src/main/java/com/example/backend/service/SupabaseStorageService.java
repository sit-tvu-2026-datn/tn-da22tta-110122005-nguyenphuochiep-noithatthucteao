package com.example.backend.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Service interface for uploading files to Supabase Storage.
 */
public interface SupabaseStorageService {

    /**
     * Uploads an image file to Supabase Storage and returns the public URL.
     *
     * @param file the multipart file to upload
     * @return the public URL of the uploaded file
     * @throws IOException if reading the file fails
     */
    String uploadFile(MultipartFile file) throws IOException;
}
