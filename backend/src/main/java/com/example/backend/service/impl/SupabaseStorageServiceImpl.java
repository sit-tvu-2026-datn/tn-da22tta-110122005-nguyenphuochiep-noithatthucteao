package com.example.backend.service.impl;

import com.example.backend.exception.FileUploadException;
import com.example.backend.exception.FileValidationException;
import com.example.backend.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
public class SupabaseStorageServiceImpl implements SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageServiceImpl.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "png", "jpg", "jpeg", "webp"
    );

    private final RestTemplate restTemplate;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket}")
    private String bucketName;

    public SupabaseStorageServiceImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        // 1. Validate file is not empty
        if (file.isEmpty()) {
            throw new FileValidationException("File không được để trống");
        }

        // 2. Validate file type by content type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new FileValidationException(
                    "Định dạng file không hợp lệ. Chỉ chấp nhận: PNG, JPG, JPEG, WEBP"
            );
        }

        // 3. Validate file extension
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new FileValidationException(
                    "Phần mở rộng file không hợp lệ. Chỉ chấp nhận: png, jpg, jpeg, webp"
            );
        }

        // 4. Generate unique filename
        String uniqueFileName = UUID.randomUUID().toString() + "." + extension.toLowerCase();

        // 5. Build the Supabase Storage upload URL
        String uploadUrl = String.format(
                "%s/storage/v1/object/%s/%s",
                supabaseUrl, bucketName, uniqueFileName
        );

        // 6. Prepare headers
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.setContentType(MediaType.parseMediaType(contentType));

        // 7. Send the file bytes to Supabase
        HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uploadUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Supabase upload failed with status: {} — body: {}",
                        response.getStatusCode(), response.getBody());
                throw new FileUploadException(
                        "Upload thất bại. Supabase trả về status: " + response.getStatusCode()
                );
            }
        } catch (HttpClientErrorException e) {
            log.error("Supabase upload HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new FileUploadException(
                    "Upload thất bại: " + e.getResponseBodyAsString(), e
            );
        } catch (Exception e) {
            if (e instanceof FileUploadException) throw e;
            log.error("Unexpected error uploading to Supabase", e);
            throw new FileUploadException("Lỗi không xác định khi upload file", e);
        }

        // 8. Build and return the public URL
        String publicUrl = String.format(
                "%s/storage/v1/object/public/%s/%s",
                supabaseUrl, bucketName, uniqueFileName
        );

        log.info("File uploaded successfully: {}", publicUrl);
        return publicUrl;
    }

    /**
     * Extracts file extension from the original filename.
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new FileValidationException("File không có phần mở rộng hợp lệ");
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}
