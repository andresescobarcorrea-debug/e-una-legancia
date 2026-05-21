-- Crear base de datos (Ejecutar solo la primera vez o manualmente)
-- CREATE DATABASE regaming_db;
-- GO

USE regaming_db;
GO

-- Drop existing tables to avoid errors on re-run
IF OBJECT_ID('votes', 'U') IS NOT NULL DROP TABLE votes;
IF OBJECT_ID('comments', 'U') IS NOT NULL DROP TABLE comments;
IF OBJECT_ID('debates', 'U') IS NOT NULL DROP TABLE debates;
IF OBJECT_ID('user_preferences', 'U') IS NOT NULL DROP TABLE user_preferences;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
IF OBJECT_ID('roles', 'U') IS NOT NULL DROP TABLE roles;
GO

-- Roles
CREATE TABLE roles (
    id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO roles (name) VALUES ('user'), ('superadmin');

-- Usuarios
CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL DEFAULT 1 FOREIGN KEY REFERENCES roles(id),
    score INT NOT NULL DEFAULT 0, -- Para los rankings
    last_username_change DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Preferencias
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    updated_at DATETIME DEFAULT GETDATE()
);

-- Debates (Publicaciones)
CREATE TABLE debates (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Comentarios
CREATE TABLE comments (
    id INT PRIMARY KEY IDENTITY(1,1),
    debate_id INT NOT NULL FOREIGN KEY REFERENCES debates(id) ON DELETE CASCADE,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE NO ACTION,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Votos (Likes/Dislikes genérico para debates, comentarios, etc)
CREATE TABLE votes (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- 'debate', 'comment'
    target_id INT NOT NULL,
    value INT NOT NULL, -- 1 para upvote, -1 para downvote
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_Vote UNIQUE (user_id, target_type, target_id)
);
GO
