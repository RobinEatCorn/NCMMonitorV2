DELETE FROM Playlists_Changes WHERE ChangeDate=Date("now","localtime");
DELETE FROM Songs_Changes WHERE ChangeDate=Date("now","localtime");
DELETE FROM Belongs_Changes WHERE ChangeDate=Date("now","localtime");

INSERT INTO Playlists_Changes
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "CHG" AS ChangeType,
        __Playlists.Pid AS Pid,
        __Playlists.Name AS OldName,
        Playlists.Name AS NewName,
        0 AS SongsAdded,
        0 AS SongsDeleted
    FROM Playlists INNER JOIN __Playlists ON Playlists.Pid=__Playlists.Pid
        WHERE NewName<>OldName
    UNION
    SELECT
        Date("now","localtime") AS ChangeDate,
        "ADD" AS ChangeType,
        Playlists.Pid AS Pid,
        Playlists.Name AS OldName,
        Playlists.Name AS NewName,
        0 AS SongsAdded,
        0 AS SongsDeleted
    FROM Playlists 
        WHERE NOT EXISTS (
            SELECT __Playlists.Pid FROM __Playlists 
                WHERE __Playlists.Pid=Playlists.Pid
        )
    UNION
    SELECT
        Date("now","localtime") AS ChangeDate,
        "DEL" AS ChangeType,
        __Playlists.Pid AS Pid,
        __Playlists.Name AS OldName,
        __Playlists.Name AS NewName,
        0 AS SongsAdded,
        0 AS SongsDeleted
    FROM __Playlists 
        WHERE NOT EXISTS (
            SELECT Playlists.Pid FROM Playlists 
                WHERE __Playlists.Pid=Playlists.Pid
        );
    
/*查找发生变化的歌单，包括：新增的歌单、被删除的歌单、更名的歌单*/


INSERT INTO Songs_Changes
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "CHG" AS ChangeType,
        Songs.Sid AS Sid,
        __Songs.Available AS OldAvailable,
        Songs.Available AS NewAvailable,
        __Songs.Name As OldName,
        Songs.Name AS NewName
    FROM Songs INNER JOIN __Songs ON Songs.Sid=__Songs.Sid
        WHERE Songs.Available<>__Songs.Available OR 
            Songs.Name<>__Songs.Name
    UNION
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "ADD" AS ChangeType,
        Songs.Sid AS Sid,
        NULL AS OldAvailable,
        Songs.Available AS NewAvailable,
        Songs.Name As OldName,
        Songs.Name AS NewName
    FROM Songs
        WHERE NOT EXISTS (
            SELECT __Songs.Sid FROM __Songs
                WHERE __Songs.Sid=Songs.Sid
        )
    UNION
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "DEL" AS ChangeType,
        __Songs.Sid AS Sid,
        __Songs.Available AS OldAvailable,
        NULL AS NewAvailable,
        __Songs.Name As OldName,
        __Songs.Name AS NewName
    FROM __Songs
        WHERE NOT EXISTS (
            SELECT Songs.Sid FROM Songs
                WHERE __Songs.Sid=Songs.Sid
        );

/*查找变化的歌曲，包括：新增的歌曲、从歌单中删除的歌曲、名字被更改或是否可听状态变化的歌曲*/

INSERT INTO Belongs_Changes
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "ADD" AS ChangeType,
        Belongs.Sid AS Sid,
        Belongs.Pid AS Pid
    FROM Belongs
        WHERE NOT EXISTS (
            SELECT * FROM __Belongs
                WHERE __Belongs.Sid=Belongs.Sid AND __Belongs.Pid=Belongs.Pid
        )
    UNION
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "DEL" AS ChangeType,
        __Belongs.Sid AS Sid,
        __Belongs.Pid AS Pid
    FROM __Belongs
        WHERE NOT EXISTS (
            SELECT * FROM Belongs
                WHERE __Belongs.Sid=Belongs.Sid AND __Belongs.Pid=Belongs.Pid
        );

/*查找变化的隶属关系，包括：新增的隶属关系，被删除的隶属关系*/

DROP TABLE IF EXISTS Temp_ADD;
CREATE TEMPORARY TABLE Temp_ADD AS
    SELECT 
        Belongs_Changes.ChangeDate AS ChangeDate,
        "CHG" AS ChangeType,
        Belongs_Changes.Pid AS Pid,
        Playlists.Name AS OldName,
        Playlists.Name AS NewName,
        COUNT(*) AS SongsAdded 
    FROM Belongs_Changes INNER JOIN Playlists ON Playlists.Pid=Belongs_Changes.Pid
        WHERE ChangeDate=Date("now","localtime") AND ChangeType="ADD"
        GROUP BY Belongs_Changes.Pid;
    
UPDATE Playlists_Changes 
    SET SongsAdded=(
        SELECT Temp_ADD.SongsAdded 
        FROM Temp_ADD 
        WHERE Temp_ADD.ChangeDate=Playlists_Changes.ChangeDate
            AND Temp_ADD.Pid=Playlists_Changes.Pid
    )
WHERE EXISTS (
    SELECT * 
    FROM Temp_ADD
    WHERE Temp_ADD.ChangeDate=Playlists_Changes.ChangeDate
        AND Temp_ADD.Pid=Playlists_Changes.Pid
);

INSERT OR IGNORE INTO Playlists_Changes (ChangeDate,ChangeType,Pid,OldName,NewName,SongsAdded)
    SELECT * FROM Temp_ADD;
DROP TABLE IF EXISTS Temp_ADD;
/* 记录歌单增加的歌曲数目变化 */

DROP TABLE IF EXISTS Temp_DEL;
CREATE TEMPORARY TABLE Temp_DEL AS
    SELECT 
        Belongs_Changes.ChangeDate AS ChangeDate,
        "CHG" AS ChangeType,
        Belongs_Changes.Pid AS Pid,
        __Playlists.Name AS OldName,
        __Playlists.Name AS NewName,
        COUNT(*) AS SongsDeleted 
    FROM Belongs_Changes INNER JOIN __Playlists ON __Playlists.Pid=Belongs_Changes.Pid
        WHERE ChangeDate=Date("now","localtime") AND ChangeType="DEL"
        GROUP BY Belongs_Changes.Pid;
    
UPDATE Playlists_Changes 
    SET SongsDeleted=(
        SELECT Temp_DEL.SongsDeleted 
        FROM Temp_DEL 
        WHERE Temp_DEL.ChangeDate=Playlists_Changes.ChangeDate
            AND Temp_DEL.Pid=Playlists_Changes.Pid
    )
WHERE EXISTS (
    SELECT * 
    FROM Temp_DEL
    WHERE Temp_DEL.ChangeDate=Playlists_Changes.ChangeDate
        AND Temp_DEL.Pid=Playlists_Changes.Pid
);

INSERT OR IGNORE INTO Playlists_Changes (ChangeDate,ChangeType,Pid,OldName,NewName,SongsDeleted)
    SELECT * FROM Temp_DEL;
DROP TABLE IF EXISTS Temp_DEL;
/* 记录歌单减少的歌曲数目变化 */

INSERT OR IGNORE INTO Playlists_Changes
    SELECT 
        Songs_Changes.ChangeDate AS ChangeDate,
        "CHG" AS ChangeType,
        Playlists.Pid AS Pid,
        Playlists.Name AS OldName,
        Playlists.Name AS NewName,
        0 AS SongsAdded,
        0 AS SongsDeleted
    FROM Songs_Changes INNER JOIN Playlists ON 
        EXISTS (
            SELECT * FROM Belongs 
            WHERE Belongs.Pid=Playlists.Pid AND
                Songs_Changes.Sid=Belongs.Sid
        )
    WHERE Songs_Changes.ChangeType="CHG"
        AND Songs_Changes.ChangeDate=Date("now","localtime");
/* 如果一首歌曲发生变化，那么在Playlists_Changes中提一嘴包含它的歌单。
   发生变化的歌曲（比如名字变化,可收听状态变化）不会被计算到SongsAdded或SongsDeleted中去。 */

INSERT OR REPLACE INTO All_Songs SELECT * FROM __Songs;
INSERT OR REPLACE INTO All_Songs SELECT * FROM Songs;
/* 更新全歌曲库 */

INSERT OR REPLACE INTO All_Playlists SELECT * FROM __Playlists;
INSERT OR REPLACE INTO All_Playlists SELECT * FROM Playlists;
/* 更新全歌单库 */