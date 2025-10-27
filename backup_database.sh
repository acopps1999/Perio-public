#!/bin/bash

# Database Backup Script
# This will create a full SQL dump of your Supabase database

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Supabase Database Backup Script${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
source .env

# Extract database connection details from Supabase URL
# Supabase URL format: https://PROJECT_REF.supabase.co
PROJECT_REF=$(echo $REACT_APP_SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')

echo -e "${YELLOW}Project Reference:${NC} $PROJECT_REF"
echo -e "${YELLOW}Backup will be saved to:${NC} ./database_backup_$(date +%Y%m%d_%H%M%S).sql\n"

# Prompt for database password
echo -e "${YELLOW}Please enter your Supabase database password:${NC}"
echo "(Find it in: Supabase Dashboard → Settings → Database → Connection String)"
read -s DB_PASSWORD
echo ""

# Generate backup filename with timestamp
BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).sql"

# Database connection details
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo -e "${YELLOW}Starting backup...${NC}\n"

# Run pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Backup completed successfully!${NC}"
    echo -e "${GREEN}✓ File saved as: $BACKUP_FILE${NC}"

    # Show file size
    FILE_SIZE=$(ls -lh $BACKUP_FILE | awk '{print $5}')
    echo -e "${GREEN}✓ Backup size: $FILE_SIZE${NC}\n"

    echo -e "${YELLOW}To restore this backup to a new Supabase project:${NC}"
    echo "1. Create a new Supabase project"
    echo "2. Run: PGPASSWORD=<new_db_password> psql -h db.<new_project_ref>.supabase.co -p 5432 -U postgres -d postgres -f $BACKUP_FILE"
else
    echo -e "\n${RED}✗ Backup failed${NC}"
    echo -e "${RED}Make sure you have pg_dump installed and the database password is correct${NC}"
    exit 1
fi

echo -e "\n${YELLOW}========================================${NC}"
