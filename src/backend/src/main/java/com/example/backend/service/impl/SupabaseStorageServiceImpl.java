package com.example.backend.service.impl;

import com.example.backend.config.SupabaseStorageProperties;
import com.example.backend.exception.FileUploadException;
import com.example.backend.exception.FileValidationException;
import com.example.backend.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class SupabaseStorageServiceImpl implements SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageServiceImpl.class);

    private static final String GLB_CONTENT_TYPE = "model/gltf-binary";
    private static final String MODEL_CACHE_CONTROL = "public, max-age=31536000, immutable";

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(
            "png", "jpg", "jpeg", "webp"
    );

    private static final Set<String> ALLOWED_GLB_CONTENT_TYPES = Set.of(
            GLB_CONTENT_TYPE,
            "application/octet-stream",
            "application/x-binary",
            "application/x-glb"
    );

    private final RestTemplate restTemplate;
    private final SupabaseStorageProperties properties;

    public SupabaseStorageServiceImpl(
            RestTemplate restTemplate,
            SupabaseStorageProperties properties
    ) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    @Override
    public String uploadFile(MultipartFile file) throws IOException {
        validateNotEmpty(file);

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new FileValidationException("Invalid image type. Allowed: PNG, JPG, JPEG, WEBP");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
            throw new FileValidationException("Invalid image extension. Allowed: png, jpg, jpeg, webp");
        }

        String objectName = UUID.randomUUID() + "." + extension;
        return uploadObject(
                properties.getBucket(),
                objectName,
                file.getBytes(),
                contentType,
                null
        );
    }

    @Override
    public String uploadProductModel(MultipartFile file) throws IOException {
        validateNotEmpty(file);
        validateModelSize(file);

        String extension = getFileExtension(file.getOriginalFilename());
        if (!"glb".equals(extension)) {
            throw new FileValidationException("Only .glb model files are supported");
        }

        String providedContentType = file.getContentType();
        if (StringUtils.hasText(providedContentType)
                && !ALLOWED_GLB_CONTENT_TYPES.contains(providedContentType.toLowerCase(Locale.ROOT))) {
            throw new FileValidationException("Invalid .glb content type: " + providedContentType);
        }

        byte[] bytes = file.getBytes();
        validateGlbBinary(bytes);

        String objectName = buildObjectName(properties.getModelPrefix(), "glb");
        return uploadObject(
                properties.getModelBucket(),
                objectName,
                bytes,
                GLB_CONTENT_TYPE,
                MODEL_CACHE_CONTROL
        );
    }

    @Override
    public void deleteProductModelByPublicUrl(String publicUrl) {
        Optional<String> objectName = extractObjectNameFromPublicUrl(publicUrl, properties.getModelBucket());
        if (objectName.isEmpty()) {
            return;
        }

        validateSupabaseConfig(properties.getModelBucket());
        String deleteUrl = buildStorageBucketUrl("object", properties.getModelBucket());

        HttpHeaders headers = createStorageHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, List<String>>> requestEntity = new HttpEntity<>(
                Map.of("prefixes", List.of(objectName.get())),
                headers
        );

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    deleteUrl,
                    HttpMethod.DELETE,
                    requestEntity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new FileUploadException("Supabase delete failed with status: " + response.getStatusCode());
            }
        } catch (RestClientResponseException e) {
            log.warn("Supabase delete failed: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new FileUploadException("Could not delete model from Supabase", e);
        } catch (RestClientException e) {
            log.warn("Supabase delete failed", e);
            throw new FileUploadException("Could not delete model from Supabase", e);
        }
    }

    private String uploadObject(
            String bucketName,
            String objectName,
            byte[] bytes,
            String contentType,
            String cacheControl
    ) {
        validateSupabaseConfig(bucketName);
        String uploadUrl = buildStorageUrl("object", bucketName, objectName);

        HttpHeaders headers = createStorageHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.set("x-upsert", "false");
        if (StringUtils.hasText(cacheControl)) {
            headers.set(HttpHeaders.CACHE_CONTROL, cacheControl);
        }

        HttpEntity<byte[]> requestEntity = new HttpEntity<>(bytes, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uploadUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Supabase upload failed: status={}, body={}", response.getStatusCode(), response.getBody());
                throw new FileUploadException("Supabase upload failed with status: " + response.getStatusCode());
            }
        } catch (RestClientResponseException e) {
            log.error("Supabase upload failed: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new FileUploadException("Supabase upload failed", e);
        } catch (RestClientException e) {
            log.error("Supabase upload failed", e);
            throw new FileUploadException("Supabase upload failed", e);
        }

        String publicUrl = buildStorageUrl("object/public", bucketName, objectName);
        log.info("Uploaded file to Supabase Storage: {}", publicUrl);
        return publicUrl;
    }

    private void validateNotEmpty(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileValidationException("File must not be empty");
        }
    }

    private void validateModelSize(MultipartFile file) {
        long maxModelSizeBytes = properties.getMaxModelSizeBytes();
        if (maxModelSizeBytes > 0 && file.getSize() > maxModelSizeBytes) {
            throw new FileValidationException("Model file is too large. Maximum size is " + maxModelSizeBytes + " bytes");
        }
    }

    private void validateGlbBinary(byte[] bytes) {
        if (bytes.length < 12) {
            throw new FileValidationException("Invalid .glb file");
        }

        boolean hasGlbMagic = bytes[0] == 'g'
                && bytes[1] == 'l'
                && bytes[2] == 'T'
                && bytes[3] == 'F';
        if (!hasGlbMagic) {
            throw new FileValidationException("Invalid .glb file signature");
        }

        int version = readLittleEndianInt(bytes, 4);
        if (version != 2) {
            throw new FileValidationException("Only GLB version 2 files are supported");
        }

        long declaredLength = Integer.toUnsignedLong(readLittleEndianInt(bytes, 8));
        if (declaredLength != bytes.length) {
            throw new FileValidationException("Invalid .glb file length");
        }
    }

    private int readLittleEndianInt(byte[] bytes, int offset) {
        return ByteBuffer.wrap(bytes, offset, Integer.BYTES)
                .order(ByteOrder.LITTLE_ENDIAN)
                .getInt();
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

    private String buildObjectName(String prefix, String extension) {
        String fileName = UUID.randomUUID() + "." + extension;
        String normalizedPrefix = normalizePrefix(prefix);
        return normalizedPrefix.isEmpty() ? fileName : normalizedPrefix + "/" + fileName;
    }

    private String normalizePrefix(String prefix) {
        if (!StringUtils.hasText(prefix)) {
            return "";
        }
        return prefix.replace("\\", "/").replaceAll("^/+|/+$", "");
    }

    private String buildStorageUrl(String objectEndpoint, String bucketName, String objectName) {
        return String.format(
                "%s/storage/v1/%s/%s/%s",
                trimTrailingSlash(properties.getUrl()),
                objectEndpoint,
                bucketName,
                objectName
        );
    }

    private String buildStorageBucketUrl(String objectEndpoint, String bucketName) {
        return String.format(
                "%s/storage/v1/%s/%s",
                trimTrailingSlash(properties.getUrl()),
                objectEndpoint,
                bucketName
        );
    }

    private HttpHeaders createStorageHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(properties.getKey());
        headers.set("apikey", properties.getKey());
        return headers;
    }

    private void validateSupabaseConfig(String bucketName) {
        if (!StringUtils.hasText(properties.getUrl()) || properties.getUrl().contains("YOUR_SUPABASE_URL")) {
            throw new FileUploadException("Supabase URL is not configured");
        }
        if (!StringUtils.hasText(properties.getKey()) || properties.getKey().contains("YOUR_SUPABASE_SECRET_KEY")) {
            throw new FileUploadException("Supabase service key is not configured");
        }
        if (!StringUtils.hasText(bucketName)) {
            throw new FileUploadException("Supabase bucket is not configured");
        }
    }

    private String trimTrailingSlash(String value) {
        return value.replaceAll("/+$", "");
    }

    private Optional<String> extractObjectNameFromPublicUrl(String publicUrl, String expectedBucket) {
        if (!StringUtils.hasText(publicUrl) || !StringUtils.hasText(expectedBucket)) {
            return Optional.empty();
        }

        try {
            String rawPath = URI.create(publicUrl).getRawPath();
            String marker = "/storage/v1/object/public/" + expectedBucket + "/";
            int markerIndex = rawPath.indexOf(marker);
            if (markerIndex < 0) {
                return Optional.empty();
            }

            String rawObjectName = rawPath.substring(markerIndex + marker.length());
            if (!StringUtils.hasText(rawObjectName)) {
                return Optional.empty();
            }
            return Optional.of(URLDecoder.decode(rawObjectName, StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
