package com.notebook.model;

import java.util.List;

public class Note {
    private String id;
    private String title;
    private String content;
    private List<String> tags;
    private String username;   // owner
    private long createdAt;
    private long updatedAt;

    public Note() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(long updatedAt) { this.updatedAt = updatedAt; }
}
