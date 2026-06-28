package com.example.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "supabase")
public class SupabaseStorageProperties {

    private String url;
    private String key;
    private String bucket = "images";
    private String modelBucket = "product-models";
    private String modelPrefix = "products/models";
    private long maxModelSizeBytes = 100 * 1024 * 1024L;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getModelBucket() {
        return modelBucket;
    }

    public void setModelBucket(String modelBucket) {
        this.modelBucket = modelBucket;
    }

    public String getModelPrefix() {
        return modelPrefix;
    }

    public void setModelPrefix(String modelPrefix) {
        this.modelPrefix = modelPrefix;
    }

    public long getMaxModelSizeBytes() {
        return maxModelSizeBytes;
    }

    public void setMaxModelSizeBytes(long maxModelSizeBytes) {
        this.maxModelSizeBytes = maxModelSizeBytes;
    }
}
