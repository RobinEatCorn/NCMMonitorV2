DELETE FROM Playlists_Changes WHERE ChangeDate=Date("now","localtime");
DELETE FROM Songs_Changes WHERE ChangeDate=Date("now","localtime");
DELETE FROM Belongs_Changes WHERE ChangeDate=Date("now","localtime");

INSERT INTO Playlists_Changes
    SELECT 
        Date("now","localtime") AS ChangeDate,
        "CHG" AS ChangeType,
        __Playlists.Pid AS Pid,
        __Playlists.Name AS OldName,
        Playlists.Name AS NewName
    FROM Playlists INNER JOIN __Playlists ON Playlists.Pid=__Playlists.Pid
        WHERE NewName<>OldName
    UNION
    SELECT
        Date("now","localtime") AS ChangeDate,
        "ADD" AS ChangeType,
        Playlists.Pid AS Pid,
        NULL AS OldName,
        Playlists.Name AS NewName
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
        NULL AS NewName
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
        NULL As OldName,
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
        NULL AS NewName
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