package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.backend.DTO.FileUploadResponse;
import com.example.backend.exception.FileUploadException;
import com.example.backend.exception.FileValidationException;
import com.example.backend.service.SupabaseStorageService;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private final String UPLOAD_DIR = "uploads/models/";

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @PostMapping("/ar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadArFile(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();
        try {
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.lastIndexOf(".") > -1) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String newFilename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = Paths.get(UPLOAD_DIR + newFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/models/")
                    .path(newFilename)
                    .toUriString();

            response.put("url", fileDownloadUri);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            response.put("error", "Lỗi khi lưu file: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FileUploadResponse> uploadImageFile(@RequestParam("file") MultipartFile file) {
        try {
            String publicUrl = supabaseStorageService.uploadFile(file);
            FileUploadResponse response = FileUploadResponse.builder()
                    .url(publicUrl)
                    .fileName(file.getOriginalFilename())
                    .message("Upload thành công")
                    .build();
            return ResponseEntity.ok(response);
        } catch (FileValidationException e) {
            FileUploadResponse response = FileUploadResponse.builder()
                    .message(e.getMessage())
                    .build();
            return ResponseEntity.badRequest().body(response);
        } catch (FileUploadException | IOException e) {
            FileUploadResponse response = FileUploadResponse.builder()
                    .message("Upload thất bại: " + e.getMessage())
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
