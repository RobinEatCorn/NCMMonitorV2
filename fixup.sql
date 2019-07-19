UPDATE Playlists_Changes
SET NewName=OldName 
WHERE ChangeType="DEL";

UPDATE Playlists_Changes
SET OldName=NewName 
WHERE ChangeType="ADD";

UPDATE Songs_Changes
SET OldName=NewName 
WHERE ChangeType="DEL";

UPDATE Songs_Changes
SET OldName=NewName 
WHERE ChangeType="ADD";