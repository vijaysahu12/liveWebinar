-- Create an admin user for testing
INSERT INTO Users (Name, Mobile, Email, UserRoleType, IsActive, CreatedAt, LastLoginAt)
VALUES ('Admin User', '1234567890', 'admin@livewebinar.com', 1, 1, GETUTCDATE(), GETUTCDATE());

-- Check if user was created
SELECT Id, Name, Mobile, Email, UserRoleType, IsActive 
FROM Users 
WHERE UserRoleType = 1;