#!/bin/bash

# PDR State Machine Setup Script
# This script helps set up the environment for the PDR system

echo "🚀 Setting up PDR State Machine System..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please update DATABASE_URL and other settings as needed."
else
    echo "ℹ️ .env file already exists, skipping creation."
fi

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."

# Default database URL from env.example
DB_URL="postgresql://postgres:password@localhost:5432/pdr_db"
if [ -f .env ]; then
    # Try to extract DATABASE_URL from .env if it exists
    DB_URL=$(grep -E "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
fi

# Test database connection
if command -v psql >/dev/null 2>&1; then
    if psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ Database connection successful!"
    else
        echo "❌ Database connection failed. Please ensure PostgreSQL is running and DATABASE_URL is correct."
        echo "Current DATABASE_URL: $DB_URL"
        echo ""
        echo "To set up PostgreSQL locally:"
        echo "1. Install PostgreSQL: brew install postgresql (on macOS)"
        echo "2. Start PostgreSQL: brew services start postgresql"
        echo "3. Create database: createdb pdr_db"
        echo "4. Update DATABASE_URL in .env file if needed"
        exit 1
    fi
else
    echo "⚠️ psql not found. Please install PostgreSQL to continue."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Install missing dependencies
echo "📦 Checking dependencies..."

if ! npm list @radix-ui/react-checkbox >/dev/null 2>&1; then
    echo "Installing missing dependencies..."
    npm install @radix-ui/react-checkbox date-fns
else
    echo "✅ All dependencies are installed."
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migration
echo "🗄️ Running database migration..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
else
    echo "❌ Database migration failed. Please check the error messages above."
    exit 1
fi

# Optional: Seed database
read -p "🌱 Would you like to seed the database with sample data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Visit http://localhost:3000 to see the application"
echo "3. Use the demo login credentials from DEMO_LOGIN_FIXED.md"
echo ""
echo "📚 Documentation:"
echo "- PDR_STATE_MACHINE_IMPLEMENTATION.md - Implementation details"
echo "- DEMO_TESTING_GUIDE.md - Testing guide"
echo ""
echo "🧪 Run tests:"
echo "- npm run test - Run all tests"
echo "- npm run test:watch - Run tests in watch mode"
