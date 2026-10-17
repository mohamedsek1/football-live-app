CREATE DATABASE IF NOT EXISTS football_live CHARACTER SET utf8mb4;
USE football_live;

CREATE TABLE IF NOT EXISTS leagues (
  id INT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  country_code VARCHAR(10) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id INT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cached FotMob schedules, one row per day.
CREATE TABLE IF NOT EXISTS schedules (
  match_date DATE PRIMARY KEY,
  payload JSON NOT NULL,
  fetched_at INT NOT NULL
);

-- Generic response cache (match details etc.).
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key VARCHAR(190) PRIMARY KEY,
  payload LONGTEXT NOT NULL,
  expires_at INT NOT NULL,
  INDEX (expires_at)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip VARCHAR(45) NOT NULL,
  window_start INT NOT NULL,
  hits INT NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);
