CREATE TABLE IF NOT EXISTS GrabTimeLog(
    GrabDate UNSIGNED BIGINT NOT NULL,
    GrabTime UNSIGNED BIGINT NOT NULL,
    
    CONSTRAINT pk_GrabTimeLog PRIMARY KEY (GrabDate,GrabTime)
);

CREATE TABLE IF NOT EXISTS Playlists (
    Pid UNSIGNED BIGINT PRIMARY KEY,
    Name TEXT NOT NULL,
    Subscribed BOOLEAN NOT NULL,
    TrackCount UNSIGNED BIGINT NOT NULL,
    Avartar TEXT
);

CREATE TABLE IF NOT EXISTS Songs (
    Sid UNSIGNED BIGINT PRIMARY KEY,
    Name TEXT NOT NULL,
    Available UNSIGNED BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS Belongs (
    Sid UNSIGNED BIGINT NOT NULL,
    Pid UNSIGNED BIGINT NOT NULL,
    
    CONSTRAINT pk_SPid PRIMARY KEY (Sid,Pid),
    CONSTRAINT fk_Sid 
        FOREIGN KEY (Sid) REFERENCES Songs (Sid),
    CONSTRAINT fk_Pid
        FOREIGN KEY (Pid) REFERENCES PlayLists (Pid)
);

CREATE TABLE IF NOT EXISTS Playlists_Changes (
    ChangeDate UNSIGNED BIGINT NOT NULL,
    ChangeType TEXT NOT NULL,
    Pid UNSIGNED BIGINT NOT NULL,
    OldName TEXT,
    NewName TEXT,
    
    CONSTRAINT pk_PC 
        PRIMARY KEY (ChangeDate,ChangeType,Pid,OldName,NewName)
);

CREATE TABLE IF NOT EXISTS Songs_Changes (
    ChangeDate UNSIGNED BIGINT NOT NULL,
    ChangeType TEXT NOT NULL,
    Sid UNSIGNED BIGINT NOT NULL,
    OldAvailable TINYINT DEFAULT 255,
    NewAvailable TINYINT DEFAULT 255,
    OldName TEXT,
    NewName TEXT,
    
    CONSTRAINT pk_SC 
        PRIMARY KEY (ChangeDate,ChangeType,Sid,OldAvailable,NewAvailable,OldName,NewName)
);

CREATE TABLE IF NOT EXISTS Belongs_Changes (
    ChangeDate UNSIGNED BIGINT NOT NULL,
    ChangeType TEXT NOT NULL,
    Sid UNSIGNED BIGINT NOT NULL,
    Pid UNSIGNED BIGINT NOT NULL,
    
    CONSTRAINT pk_BC
        PRIMARY KEY (ChangeDate,ChangeType,Sid,Pid)
);

CREATE TABLE IF NOT EXISTS __Playlists (
    Pid UNSIGNED BIGINT PRIMARY KEY,
    Name TEXT NOT NULL,
    Subscribed BOOLEAN NOT NULL,
    TrackCount UNSIGNED BIGINT NOT NULL,
    Avartar TEXT
);

CREATE TABLE IF NOT EXISTS __Songs (
    Sid UNSIGNED BIGINT PRIMARY KEY,
    Name TEXT NOT NULL,
    Available UNSIGNED BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS __Belongs (
    Sid UNSIGNED BIGINT NOT NULL,
    Pid UNSIGNED BIGINT NOT NULL,
    
    CONSTRAINT pk_SPid PRIMARY KEY (Sid,Pid),
    CONSTRAINT fk_Sid 
        FOREIGN KEY (Sid) REFERENCES Songs (Sid),
    CONSTRAINT fk_Pid
        FOREIGN KEY (Pid) REFERENCES PlayLists (Pid)
);