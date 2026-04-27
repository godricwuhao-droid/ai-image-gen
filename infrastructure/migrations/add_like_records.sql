-- 创建点赞记录表
CREATE TABLE IF NOT EXISTS like_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    generation_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_generation_like (user_id, generation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_generation_id (generation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
