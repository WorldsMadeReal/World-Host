#!/usr/bin/env node

// Standalone demo world seeding script
// This script seeds the demo world without starting the full server

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🌱 WorldHost Demo World Seeder');
console.log('===============================\n');

// Check if we have tsx available
const hasTsx = existsSync('./node_modules/.bin/tsx') || existsSync('./node_modules/.bin/tsx.cmd');

if (!hasTsx) {
  console.error('❌ tsx not found!');
  console.error('Please run "pnpm install" first to install dependencies.');
  process.exit(1);
}

// Check if TypeScript files exist
if (!existsSync('./packages/server/scripts/seed-demo.ts')) {
  console.error('❌ Seed script not found!');
  console.error('Please ensure you are in the WorldHost project root directory.');
  process.exit(1);
}

console.log('📦 Running demo world seeding...\n');

// Run the seeding script directly
const tsxCommand = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
const child = spawn('./node_modules/.bin/' + tsxCommand, ['packages/server/scripts/seed-demo.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Demo world seeding completed successfully!');
  } else {
    console.log(`\n❌ Seeding failed with code ${code}`);
  }
});

child.on('error', (error) => {
  console.error('❌ Failed to start seeding script:', error.message);
  process.exit(1);
});
