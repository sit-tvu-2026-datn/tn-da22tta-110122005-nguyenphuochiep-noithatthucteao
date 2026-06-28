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

    /**
     * Uploads a product .glb model to Supabase Storage and returns the public URL.
     *
     * @param file the multipart .glb file to upload
     * @return the public URL of the uploaded model
     * @throws IOException if reading the file fails
     */
    String uploadProductModel(MultipartFile file) throws IOException;

    /**
     * Deletes a product .glb model from Supabase Storage when the URL belongs
     * to the configured model bucket. URLs outside that bucket are ignored.
     *
     * @param publicUrl the public Supabase URL stored on the product
     */
    void deleteProductModelByPublicUrl(String publicUrl);
}
