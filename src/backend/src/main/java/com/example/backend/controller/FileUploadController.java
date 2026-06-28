package com.example.backend.controller;

import com.example.backend.DTO.FileUploadResponse;
import com.example.backend.exception.FileUploadException;
import com.example.backend.exception.FileValidationException;
import com.example.backend.service.SupabaseStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private static final String LOCAL_AR_UPLOAD_DIR = "uploads/models/";
    private static final Set<String> LEGACY_LOCAL_AR_EXTENSIONS = Set.of("usdz");

    private final SupabaseStorageService supabaseStorageService;

    public FileUploadController(SupabaseStorageService supabaseStorageService) {
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping("/models/glb")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FileUploadResponse> uploadProductModel(@RequestParam("file") MultipartFile file) {
        return uploadGlbToSupabase(file);
    }

    @PostMapping("/ar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FileUploadResponse> uploadArFile(@RequestParam("file") MultipartFile file) {
        try {
            String extension = getFileExtension(file.getOriginalFilename());
            if ("glb".equals(extension)) {
                return uploadGlbToSupabase(file);
            }

            if (!LEGACY_LOCAL_AR_EXTENSIONS.contains(extension)) {
                throw new FileValidationException("Only .glb and .usdz AR files are supported");
            }

            return uploadLegacyLocalArFile(file, extension);
        } catch (FileValidationException e) {
            return badRequest(e.getMessage());
        } catch (IOException e) {
            return serverError("Upload failed: " + e.getMessage());
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
                    .message("Upload thanh cong")
                    .build();
            return ResponseEntity.ok(response);
        } catch (FileValidationException e) {
            return badRequest(e.getMessage());
        } catch (FileUploadException | IOException e) {
            return serverError("Upload that bai: " + e.getMessage());
        }
    }

    private ResponseEntity<FileUploadResponse> uploadGlbToSupabase(MultipartFile file) {
        try {
            String publicUrl = supabaseStorageService.uploadProductModel(file);
            FileUploadResponse response = FileUploadResponse.builder()
                    .url(publicUrl)
                    .fileName(file.getOriginalFilename())
                    .message("Model uploaded successfully")
                    .build();
            return ResponseEntity.ok(response);
        } catch (FileValidationException e) {
            return badRequest(e.getMessage());
        } catch (FileUploadException | IOException e) {
            return serverError("Model upload failed: " + e.getMessage());
        }
    }

    private ResponseEntity<FileUploadResponse> uploadLegacyLocalArFile(
            MultipartFile file,
            String extension
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new FileValidationException("File must not be empty");
        }

        Files.createDirectories(Paths.get(LOCAL_AR_UPLOAD_DIR));

        String newFilename = UUID.randomUUID() + "." + extension;
        Path filePath = Paths.get(LOCAL_AR_UPLOAD_DIR).resolve(newFilename).normalize();
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/models/")
                .path(newFilename)
                .toUriString();

        FileUploadResponse response = FileUploadResponse.builder()
                .url(fileDownloadUri)
                .fileName(file.getOriginalFilename())
                .message("AR file uploaded successfully")
                .build();
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<FileUploadResponse> badRequest(String message) {
        return ResponseEntity.badRequest()
                .body(FileUploadResponse.builder().message(message).build());
    }

    private ResponseEntity<FileUploadResponse> serverError(String message) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(FileUploadResponse.builder().message(message).build());
    }

    private String getFileExtension(String filename) {
        if (!StringUtils.hasText(filename)) {
            throw new FileValidationException("File extension is required");
        }

        String cleanName = filename.replace("\\", "/");
        int slashIndex = cleanName.lastIndexOf('/');
        if (slashIndex >= 0) {
            cleanName = cleanName.substring(slashIndex + 1);
        }

        int dotIndex = cleanName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == cleanName.length() - 1) {
            throw new FileValidationException("File extension is required");
        }

        return cleanName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }
}
