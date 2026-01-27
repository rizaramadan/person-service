/**
 * Verify PostgreSQL Connection
 */

import pg from 'pg';
const { Client } = pg;
import { config } from 'dotenv';

config();

async function verifyConnection() {
  console.log('\n🔍 Verifying PostgreSQL Connection...\n');
  
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };
  
  console.log('📋 Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   Password: ${dbConfig.password ? '***' : 'NOT SET'}`);
  
  const client = new Client(dbConfig);
  
  try {
    console.log('\n🔵 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Check tables
    console.log('🔍 Checking tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log(`\n📊 Found ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check person table structure
    console.log('\n🔍 Checking person table structure...');
    const personColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'person'
      ORDER BY ordinal_position;
    `);
    
    if (personColumns.rows.length > 0) {
      console.log('\n📋 Person table columns:');
      personColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log('\n🎉 Database verification complete!\n');
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyConnection();
