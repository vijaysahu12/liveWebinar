SELECT * FROM sys.tables;

SELECT * from Webinars

SELECT * FROM WebinarSchedules 

SELECT * FROM Users
--INSERT into Users (name, Mobile, email, CreatedAt, LastLoginAt, IsActive, UserRoleType) values ('Guest User', '8763412621',   'guest@example.com', GETDATE(), GETDATE() , 1 , 0);


 
SELECT * FROM UserSubscriptions


SELECT 
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    CASE 
        WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES' 
        ELSE 'NO' 
    END AS IS_PRIMARY_KEY
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
LEFT JOIN (
    SELECT ku.TABLE_NAME, ku.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
        ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
        AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
WHERE t.TABLE_TYPE = 'BASE TABLE'
    AND t.TABLE_NAME IN ('Webinars', 'Participants', 'Polls')
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
 
 SELECT * from Users

 SELECT * From Participants 

   
  update Participants set Role = 'host' where Id = 2