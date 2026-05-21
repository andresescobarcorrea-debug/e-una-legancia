USE regaming_db;
GO

DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS debates;
DROP TABLE IF EXISTS users;
GO

CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),

    username NVARCHAR(50) NOT NULL UNIQUE,

    email NVARCHAR(100) NOT NULL UNIQUE,

    password_hash NVARCHAR(255) NOT NULL,

    avatar NVARCHAR(255) DEFAULT 'default.png',

    score INT DEFAULT 0,

    role_id INT DEFAULT 1,

    created_at DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE debates (
    id INT PRIMARY KEY IDENTITY(1,1),

    user_id INT NOT NULL,

    title NVARCHAR(255) NOT NULL,

    content NVARCHAR(MAX) NOT NULL,

    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
);
GO

CREATE TABLE comments (
    id INT PRIMARY KEY IDENTITY(1,1),

    debate_id INT NOT NULL,

    user_id INT NOT NULL,

    content NVARCHAR(MAX) NOT NULL,

    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (debate_id)
    REFERENCES debates(id),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
);
GO

CREATE TABLE votes (
    id INT PRIMARY KEY IDENTITY(1,1),

    debate_id INT NOT NULL,

    user_id INT NOT NULL,

    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (debate_id)
    REFERENCES debates(id),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
);
GO


USE regaming_db;
GO

CREATE TABLE user_preferences (
    id INT PRIMARY KEY IDENTITY(1,1),

    user_id INT NOT NULL UNIQUE,

    dark_mode BIT DEFAULT 0,

    bubbles_enabled BIT DEFAULT 1,

    favorite_genre NVARCHAR(100),

    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id)
    REFERENCES users(id)
);
GO


ALTER TABLE users
ADD profile_image VARCHAR(500);

select * from users




-- =========================================
-- TABLA PRINCIPAL DE CLIPS
-- =========================================
CREATE TABLE clips (

    id INT PRIMARY KEY IDENTITY(1,1),

    user_id INT NOT NULL,

    game_name VARCHAR(255) NOT NULL,

    title VARCHAR(255) NOT NULL,

    description VARCHAR(MAX),

    video_url VARCHAR(500) NOT NULL,

    thumbnail_url VARCHAR(500),

    views INT DEFAULT 0,

    featured BIT DEFAULT 0,

    created_at DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_Clips_User
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);



-- =========================================
-- TABLA DE LIKES
-- =========================================
CREATE TABLE clip_likes (

    clip_id INT NOT NULL,

    user_id INT NOT NULL,

    created_at DATETIME DEFAULT GETDATE(),

    PRIMARY KEY (clip_id, user_id),

    CONSTRAINT FK_ClipLikes_Clip
    FOREIGN KEY (clip_id)
    REFERENCES clips(id)
    ON DELETE CASCADE,

    CONSTRAINT FK_ClipLikes_User
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);



-- =========================================
-- TABLA DE COMENTARIOS
-- =========================================
CREATE TABLE clip_comments (

    id INT PRIMARY KEY IDENTITY(1,1),

    clip_id INT NOT NULL,

    user_id INT NOT NULL,

    content VARCHAR(MAX) NOT NULL,

    created_at DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_ClipComments_Clip
    FOREIGN KEY (clip_id)
    REFERENCES clips(id)
    ON DELETE CASCADE,

    CONSTRAINT FK_ClipComments_User
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE

);



-- =========================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =========================================
CREATE INDEX IX_Clips_GameName
ON clips(game_name);

CREATE INDEX IX_Clips_CreatedAt
ON clips(created_at);

CREATE INDEX IX_ClipComments_ClipId
ON clip_comments(clip_id);

CREATE INDEX IX_ClipLikes_ClipId
ON clip_likes(clip_id);